/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). RLS'siz global jadval — izolyatsiya servis qatlamida `userId` bo'yicha. */
export class PushSubscriptionsRepository {
  /**
   * `endpoint` UNIQUE — brauzer bir xil obunani qayta yuborishi mumkin
   * (masalan sahifa qayta ochilganda), shu sababli upsert.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, userId: string, endpoint: string, p256dh: string, auth: string }} data
   * @returns {Promise<import("@prisma/client").PushSubscription>}
   */
  async upsert(tx, data) {
    return tx.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: data,
      update: { userId: data.userId, p256dh: data.p256dh, auth: data.auth },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").PushSubscription | null>}
   */
  async findById(tx, id) {
    return tx.pushSubscription.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} userId
   * @returns {Promise<import("@prisma/client").PushSubscription[]>}
   */
  async listByUser(tx, userId) {
    return tx.pushSubscription.findMany({ where: { userId } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(tx, id) {
    await tx.pushSubscription.delete({ where: { id } });
  }
}
