import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ConflictError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Har sotuv nuqtasiga qarz hisobi
 * uchun avtomatik `Counterparty` ochiladi (DATABASE.md: "har nuqtaga
 * avtomatik counterparty ochiladi") — foydalanuvchi alohida kontragent
 * tanlamaydi. `CounterpartiesRepository`/`PriceTypesRepository`/
 * `UserAssignmentsRepository`ga to'g'ridan-to'g'ri DI orqali bog'lanadi
 * (PO/inventarizatsiya'dagi repository-darajasidagi kompozitsiya qolipi).
 */
export class SalePointsService {
  /**
   * @param {{
   *   salePointsRepository: import("./sale-points.repository.js").SalePointsRepository,
   *   counterpartiesRepository: import("../counterparties/counterparties.repository.js").CounterpartiesRepository,
   *   priceTypesRepository: import("../price-types/price-types.repository.js").PriceTypesRepository,
   *   userAssignmentsRepository: import("../user-assignments/user-assignments.repository.js").UserAssignmentsRepository,
   *   usersRepository: import("../users/users.repository.js").UsersRepository,
   * }} deps
   */
  constructor({
    salePointsRepository,
    counterpartiesRepository,
    priceTypesRepository,
    userAssignmentsRepository,
    usersRepository,
  }) {
    this.salePointsRepository = salePointsRepository;
    this.counterpartiesRepository = counterpartiesRepository;
    this.priceTypesRepository = priceTypesRepository;
    this.userAssignmentsRepository = userAssignmentsRepository;
    this.usersRepository = usersRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createSalePointSchema._type} dto
   * @returns {Promise<import("@prisma/client").SalePoint>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const priceType = await this.priceTypesRepository.findById(tx, dto.priceTypeId);
      if (!priceType) {
        throw new NotFoundError("Narx turi topilmadi");
      }
      const counterparty = await this.counterpartiesRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        type: "customer",
        name: dto.name,
        phone: dto.phone ?? null,
        creditLimit: dto.creditLimit ?? null,
        paymentTermDays: dto.paymentTermDays ?? 0,
      });
      return this.salePointsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        counterpartyId: counterparty.id,
        priceTypeId: dto.priceTypeId,
        name: dto.name,
        address: dto.address ?? null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").SalePoint[]>}
   */
  async list(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.salePointsRepository.list(tx, auth.companyId),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").SalePoint>}
   */
  async getById(auth, id) {
    const salePoint = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.salePointsRepository.findById(tx, id),
    );
    if (!salePoint) {
      throw new NotFoundError("Sotuv nuqtasi topilmadi");
    }
    return salePoint;
  }

  /**
   * Nuqta maydonlari + bog'liq kontragentning qarz sozlamalari (mavjud
   * bo'lsa) bitta so'rovda yangilanadi.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateSalePointSchema._type} dto
   * @returns {Promise<import("@prisma/client").SalePoint>}
   */
  async update(auth, id, dto) {
    const { phone, creditLimit, paymentTermDays, ...salePointFields } = dto;
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.salePointsRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Sotuv nuqtasi topilmadi");
      }
      if (dto.priceTypeId) {
        const priceType = await this.priceTypesRepository.findById(tx, dto.priceTypeId);
        if (!priceType) {
          throw new NotFoundError("Narx turi topilmadi");
        }
      }
      const counterpartyPatch = {};
      if (phone !== undefined) counterpartyPatch.phone = phone;
      if (creditLimit !== undefined) counterpartyPatch.creditLimit = creditLimit;
      if (paymentTermDays !== undefined) counterpartyPatch.paymentTermDays = paymentTermDays;
      if (salePointFields.name !== undefined) counterpartyPatch.name = salePointFields.name;
      if (Object.keys(counterpartyPatch).length > 0) {
        await this.counterpartiesRepository.update(tx, existing.counterpartyId, counterpartyPatch);
      }
      return this.salePointsRepository.update(tx, id, salePointFields);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<Array<import("@prisma/client").UserAssignment>>}
   */
  async listOperators(auth, id) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const salePoint = await this.salePointsRepository.findById(tx, id);
      if (!salePoint) {
        throw new NotFoundError("Sotuv nuqtasi topilmadi");
      }
      return this.userAssignmentsRepository.listByTarget(tx, "sale_point", id);
    });
  }

  /**
   * Foydalanuvchi telefon raqami bo'yicha topiladi (kompaniya a'zolarini
   * ro'yxatlab tanlash o'rniga — bunday endpoint hali yo'q, to'liq hodimlar
   * boshqaruvi Faza 6'da; telefon operator o'zi login qiladigan identifikator
   * bo'lgani uchun eng tabiiy minimal yechim).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {string} phone
   * @returns {Promise<import("@prisma/client").UserAssignment>}
   */
  async assignOperator(auth, id, phone) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const salePoint = await this.salePointsRepository.findById(tx, id);
      if (!salePoint) {
        throw new NotFoundError("Sotuv nuqtasi topilmadi");
      }
      const user = await this.usersRepository.findByPhone(tx, phone);
      if (!user) {
        throw new NotFoundError("Bu raqamda foydalanuvchi topilmadi");
      }
      const companyMember = await this.userAssignmentsRepository.findCompanyMember(
        tx,
        auth.companyId,
        user.id,
      );
      if (!companyMember) {
        throw new NotFoundError("Foydalanuvchi bu kompaniyada emas");
      }
      const existing = await this.userAssignmentsRepository.findOne(
        tx,
        companyMember.id,
        "sale_point",
        id,
      );
      if (existing) {
        throw new ConflictError("Foydalanuvchi allaqachon biriktirilgan");
      }
      return this.userAssignmentsRepository.create(tx, {
        id: uuidv7(),
        companyMemberId: companyMember.id,
        targetType: "sale_point",
        targetId: id,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async unassignOperator(auth, id, userId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const companyMember = await this.userAssignmentsRepository.findCompanyMember(
        tx,
        auth.companyId,
        userId,
      );
      if (!companyMember) {
        throw new NotFoundError("Foydalanuvchi bu kompaniyada emas");
      }
      const existing = await this.userAssignmentsRepository.findOne(
        tx,
        companyMember.id,
        "sale_point",
        id,
      );
      if (!existing) {
        throw new NotFoundError("Biriktiruv topilmadi");
      }
      await this.userAssignmentsRepository.remove(tx, existing.id);
    });
  }
}
