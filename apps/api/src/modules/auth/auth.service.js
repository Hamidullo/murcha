import { uuidv7 } from "uuidv7";
import { withTenant, withUserContext, withoutTenant } from "../../lib/tenant-context.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { signAccessToken, signPendingToken, verifyToken } from "../../lib/jwt.js";
import { generateOpaqueToken } from "../../lib/opaque-token.js";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "../../lib/errors.js";

const MAX_LOGIN_ATTEMPTS = 5;

/**
 * @param {import("@prisma/client").User} user
 * @returns {{ id: string, phone: string, fullName: string }}
 */
function toSafeUser(user) {
  return { id: user.id, phone: user.phone, fullName: user.fullName };
}

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Repository'larga interfeys
 * sifatida bog'lanadi — konstruktor orqali (DI), testda mock qo'yiladi.
 */
export class AuthService {
  /**
   * @param {{
   *   usersRepository: import("../users/users.repository.js").UsersRepository,
   *   companiesRepository: import("../companies/companies.repository.js").CompaniesRepository,
   *   companyMembersRepository: import("../companies/company-members.repository.js").CompanyMembersRepository,
   *   rolesRepository: import("../roles/roles.repository.js").RolesRepository,
   *   sessionsRepository: import("../sessions/sessions.repository.js").SessionsRepository,
   *   loginAttemptsRepository: import("./login-attempts.repository.js").LoginAttemptsRepository,
   * }} deps
   */
  constructor({
    usersRepository,
    companiesRepository,
    companyMembersRepository,
    rolesRepository,
    sessionsRepository,
    loginAttemptsRepository,
  }) {
    this.usersRepository = usersRepository;
    this.companiesRepository = companiesRepository;
    this.companyMembersRepository = companyMembersRepository;
    this.rolesRepository = rolesRepository;
    this.sessionsRepository = sessionsRepository;
    this.loginAttemptsRepository = loginAttemptsRepository;
  }

  /**
   * Yangi sessiya (Redis) + access token. Login/register/select-company
   * muvaffaqiyatli bo'lgach bir xil tarzda chaqiriladi.
   * @param {{ userId: string, companyId: string, roleId: string }} identity
   * @param {{ userAgent?: string, ip?: string }} [meta]
   * @returns {Promise<{ accessToken: string, sessionId: string, refreshToken: string }>}
   */
  async createSession(identity, meta = {}) {
    const sessionId = uuidv7();
    const refreshToken = generateOpaqueToken();
    await this.sessionsRepository.create(sessionId, {
      ...identity,
      refreshToken,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });
    const accessToken = signAccessToken(identity);
    return { accessToken, sessionId, refreshToken };
  }

  /**
   * Ro'yxatdan o'tish: user + company + company_member(owner) + subscription
   * bitta tranzaksiyada. Company ID oldindan generatsiya qilinadi va shu ID
   * `withTenant`ga beriladi — RLS `WITH CHECK` shu yangi kompaniyaning o'zini
   * yaratishga ruxsat beradi (`id = current_setting('app.company_id')`).
   * Muvaffaqiyatli bo'lsa darhol sessiya ochiladi (auto-login).
   * @param {import("@murcha/shared").registerSchema._type} dto
   * @param {{ userAgent?: string, ip?: string }} [meta]
   * @returns {Promise<object>}
   */
  async registerCompany(dto, meta = {}) {
    const newUserId = uuidv7();
    const newCompanyId = uuidv7();
    const passwordHash = await hashPassword(dto.password);

    const { user, company, member } = await withTenant(newCompanyId, newUserId, async (tx) => {
      const existing = await this.usersRepository.findByPhone(tx, dto.phone);
      if (existing) {
        throw new ConflictError(
          "Bu telefon raqami bilan foydalanuvchi allaqachon ro'yxatdan o'tgan",
        );
      }

      const createdUser = await this.usersRepository.create(tx, {
        id: newUserId,
        phone: dto.phone,
        passwordHash,
        fullName: dto.fullName,
      });
      const createdCompany = await this.companiesRepository.create(tx, {
        id: newCompanyId,
        name: dto.companyName,
      });
      const ownerRole = await this.rolesRepository.findSystemRoleByName(tx, "owner");
      if (!ownerRole) {
        throw new Error("Tizim roli 'owner' topilmadi — seed ishga tushirilganmi? (pnpm db:seed)");
      }
      const createdMember = await this.companyMembersRepository.create(tx, {
        id: uuidv7(),
        companyId: newCompanyId,
        userId: newUserId,
        roleId: ownerRole.id,
      });
      await tx.subscription.create({ data: { id: uuidv7(), companyId: newCompanyId } });

      return { user: createdUser, company: createdCompany, member: createdMember };
    });

    const session = await this.createSession(
      { userId: user.id, companyId: company.id, roleId: member.roleId },
      meta,
    );

    return {
      status: "authenticated",
      ...session,
      user: toSafeUser(user),
      company: { id: company.id, name: company.name },
    };
  }

  /**
   * Login: telefon+parol tekshiriladi (`users` — RLS'siz global jadval,
   * `withoutTenant`). Brute-force himoya: telefon bo'yicha oxirgi 15 daqiqada
   * `MAX_LOGIN_ATTEMPTS` marta xato urinish bo'lsa — bloklanadi (PLAN.md).
   * Muvaffaqiyatli login urinishlar hisobini nolga tushiradi. Keyin
   * `withUserContext` orqali "bu user qaysi kompaniyaga a'zo" so'raladi
   * (`company_members` RLS o'z-egalik istisnosi). Bitta kompaniya bo'lsa —
   * darhol sessiya+access token; bir nechta bo'lsa — vaqtinchalik
   * `pendingToken` + tanlash uchun ro'yxat.
   * @param {import("@murcha/shared").loginSchema._type} dto
   * @param {{ userAgent?: string, ip?: string }} [meta]
   * @returns {Promise<object>}
   */
  async login(dto, meta = {}) {
    const attempts = await this.loginAttemptsRepository.getFailureCount(dto.phone);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenError(
        "Juda ko'p noto'g'ri urinish — 15 daqiqadan keyin qayta urinib ko'ring",
      );
    }

    const user = await withoutTenant((tx) => this.usersRepository.findByPhone(tx, dto.phone));
    if (!user) {
      await this.loginAttemptsRepository.recordFailure(dto.phone);
      throw new UnauthorizedError("Telefon yoki parol noto'g'ri");
    }
    const passwordOk = await verifyPassword(user.passwordHash, dto.password);
    if (!passwordOk) {
      await this.loginAttemptsRepository.recordFailure(dto.phone);
      throw new UnauthorizedError("Telefon yoki parol noto'g'ri");
    }
    await this.loginAttemptsRepository.reset(dto.phone);

    const memberships = await withUserContext(user.id, (tx) =>
      this.companyMembersRepository.findByUserId(tx, user.id),
    );
    if (memberships.length === 0) {
      throw new ForbiddenError("Faol kompaniya a'zoligi topilmadi");
    }

    if (memberships.length === 1) {
      const membership = memberships[0];
      const session = await this.createSession(
        { userId: user.id, companyId: membership.companyId, roleId: membership.roleId },
        meta,
      );
      return {
        status: "authenticated",
        ...session,
        user: toSafeUser(user),
        company: { id: membership.company.id, name: membership.company.name },
      };
    }

    return {
      status: "select_company",
      pendingToken: signPendingToken({ userId: user.id }),
      companies: memberships.map((m) => ({ id: m.company.id, name: m.company.name })),
    };
  }

  /**
   * Login'da bir nechta kompaniya topilganda ishlatiladigan ikkinchi qadam.
   * @param {import("@murcha/shared").selectCompanySchema._type} dto
   * @param {{ userAgent?: string, ip?: string }} [meta]
   * @returns {Promise<object>}
   */
  async selectCompany(dto, meta = {}) {
    let decoded;
    try {
      decoded = verifyToken(dto.pendingToken);
    } catch {
      throw new UnauthorizedError("Token yaroqsiz yoki muddati o'tgan");
    }
    if (decoded.type !== "pending") {
      throw new UnauthorizedError("Noto'g'ri token turi");
    }

    const memberships = await withUserContext(decoded.userId, (tx) =>
      this.companyMembersRepository.findByUserId(tx, decoded.userId),
    );
    const membership = memberships.find((m) => m.companyId === dto.companyId);
    if (!membership) {
      throw new ForbiddenError("Bu kompaniyaga a'zo emassiz");
    }

    const user = await withoutTenant((tx) => this.usersRepository.findById(tx, decoded.userId));
    const session = await this.createSession(
      { userId: decoded.userId, companyId: membership.companyId, roleId: membership.roleId },
      meta,
    );

    return {
      status: "authenticated",
      ...session,
      user: toSafeUser(user),
      company: { id: membership.company.id, name: membership.company.name },
    };
  }

  /**
   * Refresh token rotation. Reuse aniqlansa (berilgan token Redis'dagi
   * joriy qiymatga mos kelmasa) — sessiya darhol bekor qilinadi (o'g'irlanish
   * belgisi, PLAN.md).
   * @param {{ sessionId: string, refreshToken: string }} cookie
   * @returns {Promise<{ accessToken: string, sessionId: string, refreshToken: string }>}
   */
  async refresh(cookie) {
    const stored = await this.sessionsRepository.getRefreshToken(cookie.sessionId);
    if (!stored) {
      throw new UnauthorizedError("Sessiya topilmadi yoki muddati o'tgan");
    }
    if (stored !== cookie.refreshToken) {
      const session = await this.sessionsRepository.getSession(cookie.sessionId);
      await this.sessionsRepository.revoke(cookie.sessionId, session?.userId);
      throw new UnauthorizedError("Token qayta ishlatildi — sessiya bekor qilindi");
    }

    const session = await this.sessionsRepository.getSession(cookie.sessionId);
    if (!session) {
      throw new UnauthorizedError("Sessiya topilmadi yoki muddati o'tgan");
    }

    const refreshToken = generateOpaqueToken();
    await this.sessionsRepository.rotateRefreshToken(cookie.sessionId, refreshToken);
    const accessToken = signAccessToken({
      userId: session.userId,
      companyId: session.companyId,
      roleId: session.roleId,
    });

    return { accessToken, sessionId: cookie.sessionId, refreshToken };
  }

  /**
   * @param {{ sessionId: string }} cookie
   * @returns {Promise<void>}
   */
  async logout(cookie) {
    const session = await this.sessionsRepository.getSession(cookie.sessionId);
    await this.sessionsRepository.revoke(cookie.sessionId, session?.userId);
  }

  /**
   * Joriy sessiya cookie orqali "men kimman" aniqlanadi, so'ng shu
   * foydalanuvchining BARCHA sessiyalari qaytariladi.
   * @param {{ sessionId: string }} cookie
   * @returns {Promise<Array<{ id: string, userAgent: string | null, ip: string | null, createdAt: string, current: boolean }>>}
   */
  async listSessions(cookie) {
    const current = await this.sessionsRepository.getSession(cookie.sessionId);
    if (!current) {
      throw new UnauthorizedError("Sessiya topilmadi yoki muddati o'tgan");
    }
    const sessions = await this.sessionsRepository.listByUser(current.userId);
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent ?? null,
      ip: s.ip ?? null,
      createdAt: s.createdAt,
      current: s.id === cookie.sessionId,
    }));
  }

  /**
   * @param {{ sessionId: string }} cookie
   * @param {string} targetSessionId
   * @returns {Promise<void>}
   */
  async revokeSession(cookie, targetSessionId) {
    const current = await this.sessionsRepository.getSession(cookie.sessionId);
    if (!current) {
      throw new UnauthorizedError("Sessiya topilmadi yoki muddati o'tgan");
    }
    const target = await this.sessionsRepository.getSession(targetSessionId);
    if (!target || target.userId !== current.userId) {
      throw new NotFoundError("Sessiya topilmadi");
    }
    await this.sessionsRepository.revoke(targetSessionId, current.userId);
  }

  /**
   * `GET /api/v1/auth/me` — `requireAuth` middleware'i o'rnatgan `req.auth`
   * asosida joriy foydalanuvchi/kompaniya profilini qaytaradi.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<{ user: object, company: object | null, roleId: string }>}
   */
  async getCurrentUser(auth) {
    const user = await withoutTenant((tx) => this.usersRepository.findById(tx, auth.userId));
    if (!user) {
      throw new UnauthorizedError("Foydalanuvchi topilmadi");
    }
    const company = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.companiesRepository.findById(tx, auth.companyId),
    );

    return {
      user: toSafeUser(user),
      company: company ? { id: company.id, name: company.name } : null,
      roleId: auth.roleId,
    };
  }
}
