import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ConflictError } from "../../lib/errors.js";

const MANAGE_PERMISSION = "deliveries.manage";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Dostavka — allaqachon `shipped`
 * zakazlarni kuryerga biriktirib marshrutga yig'ish; `orders.service.js`dagi
 * `ship()`dan keyingi bosqich. Ro'yxat/detal ko'rish — `deliveries.manage`
 * ruxsati bo'lsa butun kompaniya, bo'lmasa faqat o'z (kuryer) dostavkalari
 * (egalik tekshiruvi, `orders.service.js`dagi `canViewAll` naqshi bilan bir
 * xil).
 */
export class DeliveriesService {
  /**
   * @param {{
   *   deliveriesRepository: import("./deliveries.repository.js").DeliveriesRepository,
   *   ordersRepository: import("../orders/orders.repository.js").OrdersRepository,
   *   companyMembersRepository: import("../companies/company-members.repository.js").CompanyMembersRepository,
   *   rolesRepository: import("../roles/roles.repository.js").RolesRepository,
   * }} deps
   */
  constructor({
    deliveriesRepository,
    ordersRepository,
    companyMembersRepository,
    rolesRepository,
  }) {
    this.deliveriesRepository = deliveriesRepository;
    this.ordersRepository = ordersRepository;
    this.companyMembersRepository = companyMembersRepository;
    this.rolesRepository = rolesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createDeliverySchema._type} dto
   * @returns {Promise<import("@prisma/client").Delivery>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const courier = await this.companyMembersRepository.findById(tx, dto.courierMemberId);
      if (!courier || courier.companyId !== auth.companyId) {
        throw new NotFoundError("Kuryer topilmadi");
      }

      const orders = [];
      for (const orderId of dto.orderIds) {
        const order = await this.ordersRepository.findById(tx, orderId);
        if (!order || order.companyId !== auth.companyId) {
          throw new NotFoundError(`Zakaz topilmadi: ${orderId}`);
        }
        if (order.status !== "shipped") {
          throw new ConflictError(
            `Faqat jo'natilgan (yo'ldagi) zakazlarni kuryerga biriktirish mumkin: № ${order.number}`,
          );
        }
        orders.push(order);
      }

      const cashExpected = orders.reduce((sum, order) => sum + Number(order.total), 0);

      const delivery = await this.deliveriesRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        courierMemberId: dto.courierMemberId,
        date: new Date(),
        status: "assigned",
        cashExpected,
      });

      let sortOrder = 0;
      for (const order of orders) {
        await this.deliveriesRepository.addOrder(tx, {
          id: uuidv7(),
          deliveryId: delivery.id,
          orderId: order.id,
          sortOrder: sortOrder++,
        });
      }

      return this.deliveriesRepository.findById(tx, delivery.id);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ status?: string }} [filters]
   * @returns {Promise<import("@prisma/client").Delivery[]>}
   */
  async list(auth, filters = {}) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const canManage = await this.rolesRepository.hasPermission(
        tx,
        auth.roleId,
        MANAGE_PERMISSION,
      );
      if (canManage) {
        return this.deliveriesRepository.list(tx, auth.companyId, filters);
      }
      const member = await this.companyMembersRepository.findByCompanyAndUser(
        tx,
        auth.companyId,
        auth.userId,
      );
      if (!member) {
        return [];
      }
      return this.deliveriesRepository.list(tx, auth.companyId, {
        ...filters,
        courierMemberId: member.id,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Delivery>}
   */
  async getById(auth, id) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const delivery = await this.deliveriesRepository.findById(tx, id);
      if (!delivery || delivery.companyId !== auth.companyId) {
        throw new NotFoundError("Dostavka topilmadi");
      }
      const canManage = await this.rolesRepository.hasPermission(
        tx,
        auth.roleId,
        MANAGE_PERMISSION,
      );
      if (canManage) {
        return delivery;
      }
      const member = await this.companyMembersRepository.findByCompanyAndUser(
        tx,
        auth.companyId,
        auth.userId,
      );
      if (!member || delivery.courierMemberId !== member.id) {
        throw new NotFoundError("Dostavka topilmadi");
      }
      return delivery;
    });
  }

  /**
   * Kuryer bir bekatni "yetkazildi" deb belgilaydi: order `shipped→delivered`,
   * 4 xonali `acceptCode` generatsiya qilinadi (do'kon qabul qilishda shu
   * kodni kiritadi — PLAN.md F: "imzo/kod"). Faqat shu dostavkaning o'z
   * kuryeri chaqira oladi (egalik tekshiruvi, ruxsat emas). Barcha bekatlar
   * yetkazilsa `Delivery` avtomatik "done"ga o'tadi.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} deliveryId
   * @param {string} orderId
   * @param {import("@murcha/shared").deliverStopSchema._type} dto
   * @returns {Promise<import("@prisma/client").DeliveryOrder>}
   */
  async deliverStop(auth, deliveryId, orderId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const delivery = await this.deliveriesRepository.findById(tx, deliveryId);
      if (!delivery || delivery.companyId !== auth.companyId) {
        throw new NotFoundError("Dostavka topilmadi");
      }
      const member = await this.companyMembersRepository.findByCompanyAndUser(
        tx,
        auth.companyId,
        auth.userId,
      );
      if (!member || delivery.courierMemberId !== member.id) {
        throw new NotFoundError("Dostavka topilmadi");
      }

      const stop = delivery.orders.find((o) => o.orderId === orderId);
      if (!stop) {
        throw new NotFoundError("Bekat topilmadi");
      }
      if (stop.deliveredAt) {
        throw new ConflictError("Bu bekat allaqachon yetkazilgan");
      }
      if (stop.order.status !== "shipped") {
        throw new ConflictError("Faqat yo'ldagi zakazni yetkazilgan deb belgilash mumkin");
      }

      const acceptCode = String(Math.floor(1000 + Math.random() * 9000));
      const updatedStop = await this.deliveriesRepository.updateOrderStop(tx, stop.id, {
        deliveredAt: new Date(),
        acceptCode,
      });

      await this.ordersRepository.update(tx, orderId, { status: "delivered" });
      await this.ordersRepository.addStatusHistory(tx, {
        id: uuidv7(),
        orderId,
        fromStatus: "shipped",
        toStatus: "delivered",
        byUser: auth.userId,
        comment: null,
      });

      const cashCollected = dto.cashCollected ?? Number(stop.order.total);
      await this.deliveriesRepository.incrementCashCollected(tx, deliveryId, cashCollected);

      const stillOpen = delivery.orders.some((o) => o.orderId !== orderId && !o.deliveredAt);
      if (!stillOpen) {
        await this.deliveriesRepository.update(tx, deliveryId, {
          status: "done",
          closedAt: new Date(),
        });
      }

      return updatedStop;
    });
  }
}
