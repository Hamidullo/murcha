import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
const withoutTenant = vi.fn((callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant, withoutTenant }));

const emitToCompany = vi.fn();
vi.mock("../../lib/socket.js", () => ({ emitToCompany }));

const sendWebPush = vi.fn().mockResolvedValue({ expired: false });
vi.mock("../../lib/web-push.js", () => ({ sendWebPush }));

const { NotificationsService } = await import("./notifications.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("NotificationsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let notificationsRepository;
  let companyMembersRepository;
  let rolesRepository;
  let pushSubscriptionsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    withoutTenant.mockClear();
    emitToCompany.mockClear();
    sendWebPush.mockClear().mockResolvedValue({ expired: false });
    notificationsRepository = {
      create: vi.fn(),
      listByUser: vi.fn(),
      findById: vi.fn(),
      markRead: vi.fn(),
    };
    companyMembersRepository = { list: vi.fn() };
    rolesRepository = { hasPermission: vi.fn() };
    pushSubscriptionsRepository = { listByUser: vi.fn().mockResolvedValue([]), remove: vi.fn() };
    service = new NotificationsService({
      notificationsRepository,
      companyMembersRepository,
      rolesRepository,
      pushSubscriptionsRepository,
    });
  });

  it("list — repository.listByUser'ni auth.userId va filtrlar bilan chaqiradi", async () => {
    notificationsRepository.listByUser.mockResolvedValue([{ id: "n1" }]);

    const result = await service.list(auth, { unreadOnly: true });

    expect(notificationsRepository.listByUser).toHaveBeenCalledWith(fakeTx, "u1", {
      unreadOnly: true,
    });
    expect(result).toEqual([{ id: "n1" }]);
  });

  describe("markRead", () => {
    it("bildirishnoma topilmasa NotFoundError otadi", async () => {
      notificationsRepository.findById.mockResolvedValue(null);

      await expect(service.markRead(auth, "n1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("boshqa foydalanuvchining bildirishnomasi bo'lsa NotFoundError otadi", async () => {
      notificationsRepository.findById.mockResolvedValue({ id: "n1", userId: "u2" });

      await expect(service.markRead(auth, "n1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("o'z bildirishnomasini o'qilgan deb belgilaydi", async () => {
      notificationsRepository.findById.mockResolvedValue({ id: "n1", userId: "u1" });
      notificationsRepository.markRead.mockResolvedValue({ id: "n1", readAt: new Date() });

      const result = await service.markRead(auth, "n1");

      expect(notificationsRepository.markRead).toHaveBeenCalledWith(fakeTx, "n1");
      expect(result.id).toBe("n1");
    });
  });

  describe("notifyOrderNew", () => {
    const event = {
      companyId: "c1",
      orderId: "o1",
      orderNumber: "ZAK-2026-00001",
      salePointId: "sp1",
    };

    it("faqat aktiv va orders.confirm ruxsatiga ega a'zolarga bildirishnoma yaratadi", async () => {
      companyMembersRepository.list.mockResolvedValue([
        { userId: "u1", roleId: "r1", status: "active" },
        { userId: "u2", roleId: "r2", status: "active" },
        { userId: "u3", roleId: "r1", status: "blocked" },
      ]);
      rolesRepository.hasPermission.mockImplementation((_tx, roleId) =>
        Promise.resolve(roleId === "r1"),
      );
      notificationsRepository.create.mockImplementation((_tx, data) => Promise.resolve(data));

      const result = await service.notifyOrderNew(event);

      expect(withTenant).toHaveBeenCalledWith("c1", null, expect.any(Function));
      // faqat bitta bildirishnoma kutiladi (u1, aktiv+r1), u2 aktiv lekin ruxsati yo'q, u3 bloklangan
      expect(notificationsRepository.create).toHaveBeenCalledTimes(1);
      expect(notificationsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyId: "c1",
          userId: "u1",
          type: "order.new",
          title: "Yangi zakaz",
          body: "№ ZAK-2026-00001",
          data: { orderId: "o1", salePointId: "sp1" },
          channel: "inapp",
        }),
      );
      expect(result).toHaveLength(1);
      expect(emitToCompany).toHaveBeenCalledTimes(1);
      expect(emitToCompany).toHaveBeenCalledWith(
        "c1",
        "notification",
        expect.objectContaining({ userId: "u1", type: "order.new" }),
      );
      expect(pushSubscriptionsRepository.listByUser).toHaveBeenCalledWith(fakeTx, "u1");
    });

    it("push obuna mavjud bo'lsa sendWebPush chaqiradi, muddati o'tgan bo'lsa obunani o'chiradi", async () => {
      companyMembersRepository.list.mockResolvedValue([
        { userId: "u1", roleId: "r1", status: "active" },
      ]);
      rolesRepository.hasPermission.mockResolvedValue(true);
      notificationsRepository.create.mockImplementation((_tx, data) => Promise.resolve(data));
      pushSubscriptionsRepository.listByUser.mockResolvedValue([
        { id: "ps1", endpoint: "https://push.example/1", p256dh: "p1", auth: "a1" },
      ]);
      sendWebPush.mockResolvedValue({ expired: true });

      await service.notifyOrderNew(event);

      expect(sendWebPush).toHaveBeenCalledWith(
        { endpoint: "https://push.example/1", keys: { p256dh: "p1", auth: "a1" } },
        expect.objectContaining({ title: "Yangi zakaz" }),
      );
      expect(pushSubscriptionsRepository.remove).toHaveBeenCalledWith(fakeTx, "ps1");
    });

    it("hech kim ruxsatga ega bo'lmasa bo'sh ro'yxat qaytaradi", async () => {
      companyMembersRepository.list.mockResolvedValue([
        { userId: "u1", roleId: "r1", status: "active" },
      ]);
      rolesRepository.hasPermission.mockResolvedValue(false);

      const result = await service.notifyOrderNew(event);

      expect(notificationsRepository.create).not.toHaveBeenCalled();
      expect(emitToCompany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
