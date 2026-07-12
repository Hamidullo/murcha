import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { hashPassword } from "../../lib/password.js";
import { generateOpaqueToken } from "../../lib/opaque-token.js";
import { sendSms } from "../../lib/sms.js";
import { env } from "../../config/env.js";
import { NotFoundError, ConflictError } from "../../lib/errors.js";
import { logAudit } from "../../lib/audit.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Hodim yaratish **parolsiz** —
 * `passwordHash`ga hech kimga ma'lum bo'lmagan tasodifiy qiymat yoziladi
 * (Django'ning "unusable password" konsepsiyasiga o'xshash — NOT NULL
 * ustunni buzmasdan "parol hali o'rnatilmagan" holatini ifodalaydi).
 * Haqiqiy parol o'rnatish taklif havolasi orqali (`lib/sms.js` +
 * `POST /auth/set-password`). Telefon raqami bo'yicha `User` global (RLS'siz)
 * — agar shu odam allaqachon boshqa kompaniyada ro'yxatdan o'tgan bo'lsa,
 * yangi `User` yaratilmaydi, faqat shu kompaniyaga yangi `CompanyMember`
 * qo'shiladi (bitta odam bir nechta kompaniyada ishlashi mumkin, PLAN.md).
 * SMS yuborish DB tranzaksiyasidan **tashqarida** (tarmoq I/O tranzaksiya
 * ichida bo'lmaydi — Faza 2/4'dagi bilan bir xil konvensiya).
 */
export class CompanyMembersService {
  /**
   * @param {{
   *   companyMembersRepository: import("./company-members.repository.js").CompanyMembersRepository,
   *   usersRepository: import("../users/users.repository.js").UsersRepository,
   *   rolesRepository: import("../roles/roles.repository.js").RolesRepository,
   *   userAssignmentsRepository: import("../user-assignments/user-assignments.repository.js").UserAssignmentsRepository,
   *   sessionsRepository: import("../sessions/sessions.repository.js").SessionsRepository,
   *   passwordResetRepository: import("../auth/password-reset.repository.js").PasswordResetRepository,
   *   auditLogsRepository: import("../audit-logs/audit-logs.repository.js").AuditLogsRepository,
   * }} deps
   */
  constructor({
    companyMembersRepository,
    usersRepository,
    rolesRepository,
    userAssignmentsRepository,
    sessionsRepository,
    passwordResetRepository,
    auditLogsRepository,
  }) {
    this.companyMembersRepository = companyMembersRepository;
    this.usersRepository = usersRepository;
    this.rolesRepository = rolesRepository;
    this.userAssignmentsRepository = userAssignmentsRepository;
    this.sessionsRepository = sessionsRepository;
    this.passwordResetRepository = passwordResetRepository;
    this.auditLogsRepository = auditLogsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createEmployeeSchema._type} dto
   * @returns {Promise<import("@prisma/client").CompanyMember>}
   */
  async create(auth, dto) {
    let isNewUser = false;
    const member = await withTenant(auth.companyId, auth.userId, async (tx) => {
      await this.#requireAccessibleRole(tx, auth, dto.roleId);

      let user = await this.usersRepository.findByPhone(tx, dto.phone);
      if (!user) {
        isNewUser = true;
        const unusablePassword = generateOpaqueToken();
        user = await this.usersRepository.create(tx, {
          id: uuidv7(),
          phone: dto.phone,
          passwordHash: await hashPassword(unusablePassword),
          fullName: dto.fullName,
        });
      }

      const existing = await this.companyMembersRepository.findByCompanyAndUser(
        tx,
        auth.companyId,
        user.id,
      );
      if (existing) {
        throw new ConflictError("Bu foydalanuvchi allaqachon kompaniya a'zosi");
      }

      const created = await this.companyMembersRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        userId: user.id,
        roleId: dto.roleId,
      });

      for (const assignment of dto.assignments ?? []) {
        await this.userAssignmentsRepository.create(tx, {
          id: uuidv7(),
          companyMemberId: created.id,
          targetType: assignment.targetType,
          targetId: assignment.targetId,
        });
      }

      await logAudit(tx, this.auditLogsRepository, {
        companyId: auth.companyId,
        userId: auth.userId,
        action: "create",
        entityType: "company_member",
        entityId: created.id,
        before: null,
        after: { phone: dto.phone, roleId: dto.roleId },
      });

      return this.companyMembersRepository.findById(tx, created.id);
    });

    // Faqat yangi (parolsiz) foydalanuvchiga taklif SMS'i yuboriladi — mavjud
    // foydalanuvchi (boshqa kompaniyadan qo'shilgan) o'z paroli bilan kiraveradi.
    if (isNewUser) {
      const token = await this.passwordResetRepository.createToken(member.userId);
      await sendSms(
        member.user.phone,
        `Murcha: sizga "${member.role.name}" sifatida hisob ochildi. Parol o'rnatish: ${env.appWebUrl}/set-password?token=${token}`,
      );
    }

    return member;
  }

  /**
   * Ega tomonidan majburiy parol tiklash — joriy parol darhol ishlamay
   * qoladi (yangi "unusable" qiymat bilan almashtiriladi, hodim yaratishdagi
   * bilan bir xil naqsh) va barcha aktiv sessiyalar bekor qilinadi, so'ng
   * yangi taklif tokeni SMS orqali yuboriladi.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<void>}
   */
  async resetPassword(auth, id) {
    const member = await withTenant(auth.companyId, auth.userId, async (tx) => {
      const found = await this.#requireOwnMember(tx, auth, id);
      const unusablePassword = generateOpaqueToken();
      await this.usersRepository.update(tx, found.userId, {
        passwordHash: await hashPassword(unusablePassword),
      });
      await logAudit(tx, this.auditLogsRepository, {
        companyId: auth.companyId,
        userId: auth.userId,
        action: "reset_password",
        entityType: "company_member",
        entityId: id,
        before: null,
        after: null,
      });
      return this.companyMembersRepository.findById(tx, id);
    });

    const sessions = await this.sessionsRepository.listByUser(member.userId);
    await Promise.all(
      sessions.map((session) => this.sessionsRepository.revoke(session.id, member.userId)),
    );

    const token = await this.passwordResetRepository.createToken(member.userId);
    await sendSms(
      member.user.phone,
      `Murcha: parolingiz tiklandi. Yangi parol o'rnatish: ${env.appWebUrl}/set-password?token=${token}`,
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").CompanyMember[]>}
   */
  async list(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.companyMembersRepository.list(tx, auth.companyId),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").CompanyMember>}
   */
  async getById(auth, id) {
    return withTenant(auth.companyId, auth.userId, async (tx) =>
      this.#requireOwnMember(tx, auth, id),
    );
  }

  /**
   * Rol o'zgartirish va/yoki bloklash/faollashtirish. Bloklashda hodimning
   * BARCHA aktiv sessiyalari darhol bekor qilinadi (PLAN.md: "hodim ishdan
   * ketganda ega uni bloklashi bilan barcha sessiyalari bir zumda bekor
   * bo'ladi").
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateEmployeeSchema._type} dto
   * @returns {Promise<import("@prisma/client").CompanyMember>}
   */
  async update(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const member = await this.#requireOwnMember(tx, auth, id);
      if (dto.roleId) {
        await this.#requireAccessibleRole(tx, auth, dto.roleId);
      }
      const updated = await this.companyMembersRepository.update(tx, id, dto);

      if (dto.status === "blocked") {
        const sessions = await this.sessionsRepository.listByUser(member.userId);
        await Promise.all(
          sessions.map((session) => this.sessionsRepository.revoke(session.id, member.userId)),
        );
      }

      await logAudit(tx, this.auditLogsRepository, {
        companyId: auth.companyId,
        userId: auth.userId,
        action: "update",
        entityType: "company_member",
        entityId: id,
        before: { status: member.status, roleId: member.roleId },
        after: dto,
      });

      return updated;
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ companyId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").CompanyMember>}
   */
  async #requireOwnMember(tx, auth, id) {
    const member = await this.companyMembersRepository.findById(tx, id);
    if (!member || member.companyId !== auth.companyId) {
      throw new NotFoundError("Hodim topilmadi");
    }
    return member;
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ companyId: string }} auth
   * @param {string} roleId
   * @returns {Promise<void>}
   */
  async #requireAccessibleRole(tx, auth, roleId) {
    const role = await this.rolesRepository.findById(tx, roleId);
    if (!role || (role.companyId !== null && role.companyId !== auth.companyId)) {
      throw new NotFoundError("Rol topilmadi");
    }
  }
}
