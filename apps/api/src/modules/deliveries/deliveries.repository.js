/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class DeliveriesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Delivery>}
   */
  async create(tx, data) {
    return tx.delivery.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").DeliveryOrder>}
   */
  async addOrder(tx, data) {
    return tx.deliveryOrder.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<(import("@prisma/client").Delivery & { orders: (import("@prisma/client").DeliveryOrder & { order: import("@prisma/client").Order })[] }) | null>}
   */
  async findById(tx, id) {
    return tx.delivery.findUnique({
      where: { id },
      include: { orders: { include: { order: true }, orderBy: { sortOrder: "asc" } } },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ courierMemberId?: string, status?: string }} [filters]
   * @returns {Promise<import("@prisma/client").Delivery[]>}
   */
  async list(tx, companyId, filters = {}) {
    return tx.delivery.findMany({
      where: {
        companyId,
        ...(filters.courierMemberId ? { courierMemberId: filters.courierMemberId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Delivery>}
   */
  async update(tx, id, data) {
    return tx.delivery.update({ where: { id }, data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {number} amount
   * @returns {Promise<import("@prisma/client").Delivery>}
   */
  async incrementCashCollected(tx, id, amount) {
    return tx.delivery.update({ where: { id }, data: { cashCollected: { increment: amount } } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} deliveryId
   * @param {string} orderId
   * @returns {Promise<import("@prisma/client").DeliveryOrder | null>}
   */
  async findOrderStop(tx, deliveryId, orderId) {
    return tx.deliveryOrder.findFirst({ where: { deliveryId, orderId } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").DeliveryOrder>}
   */
  async updateOrderStop(tx, id, data) {
    return tx.deliveryOrder.update({ where: { id }, data });
  }

  /**
   * Do'kon qabul qilishda `acceptCode`ni tekshirish uchun — order o'zi
   * qaysi dostavkaga tegishli ekanini bilmaydi (`orders` moduli
   * `deliveries`ga bog'liq emas), shu sabab `orderId` bo'yicha to'g'ridan-to'g'ri.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} orderId
   * @returns {Promise<import("@prisma/client").DeliveryOrder | null>}
   */
  async findByOrderId(tx, orderId) {
    return tx.deliveryOrder.findFirst({ where: { orderId } });
  }
}
