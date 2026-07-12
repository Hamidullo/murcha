import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { DeliveriesService } = await import("./deliveries.service.js");
const { NotFoundError, ConflictError } = await import("../../lib/errors.js");

describe("DeliveriesService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let deliveriesRepository;
  let ordersRepository;
  let companyMembersRepository;
  let rolesRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    deliveriesRepository = {
      create: vi.fn(),
      addOrder: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      incrementCashCollected: vi.fn(),
      findOrderStop: vi.fn(),
      updateOrderStop: vi.fn(),
    };
    ordersRepository = {
      findById: vi.fn(),
      update: vi.fn(),
      addStatusHistory: vi.fn(),
    };
    companyMembersRepository = { findById: vi.fn(), findByCompanyAndUser: vi.fn() };
    rolesRepository = { hasPermission: vi.fn() };
    service = new DeliveriesService({
      deliveriesRepository,
      ordersRepository,
      companyMembersRepository,
      rolesRepository,
    });
  });

  describe("create", () => {
    const dto = { courierMemberId: "m1", orderIds: ["o1", "o2"] };

    it("kuryer topilmasa NotFoundError", async () => {
      companyMembersRepository.findById.mockResolvedValue(null);

      await expect(service.create(auth, dto)).rejects.toThrow(NotFoundError);
    });

    it("boshqa kompaniya kuryeri bo'lsa NotFoundError", async () => {
      companyMembersRepository.findById.mockResolvedValue({ id: "m1", companyId: "c2" });

      await expect(service.create(auth, dto)).rejects.toThrow(NotFoundError);
    });

    it("zakaz shipped bo'lmasa ConflictError", async () => {
      companyMembersRepository.findById.mockResolvedValue({ id: "m1", companyId: "c1" });
      ordersRepository.findById.mockResolvedValue({
        id: "o1",
        companyId: "c1",
        status: "picking",
        number: "1",
        total: 100,
      });

      await expect(service.create(auth, dto)).rejects.toThrow(ConflictError);
    });

    it("to'g'ri holatda Delivery+DeliveryOrder'larni sortOrder bilan yaratadi", async () => {
      companyMembersRepository.findById.mockResolvedValue({ id: "m1", companyId: "c1" });
      ordersRepository.findById.mockImplementation((_tx, id) =>
        Promise.resolve({ id, companyId: "c1", status: "shipped", number: id, total: 100 }),
      );
      deliveriesRepository.create.mockResolvedValue({ id: "d1" });
      deliveriesRepository.findById.mockResolvedValue({ id: "d1" });

      await service.create(auth, dto);

      expect(deliveriesRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyId: "c1",
          courierMemberId: "m1",
          status: "assigned",
          cashExpected: 200,
        }),
      );
      expect(deliveriesRepository.addOrder).toHaveBeenCalledTimes(2);
      expect(deliveriesRepository.addOrder).toHaveBeenNthCalledWith(
        1,
        fakeTx,
        expect.objectContaining({ deliveryId: "d1", orderId: "o1", sortOrder: 0 }),
      );
      expect(deliveriesRepository.addOrder).toHaveBeenNthCalledWith(
        2,
        fakeTx,
        expect.objectContaining({ deliveryId: "d1", orderId: "o2", sortOrder: 1 }),
      );
    });
  });

  describe("list", () => {
    it("deliveries.manage bo'lsa butun kompaniya ro'yxatini qaytaradi", async () => {
      rolesRepository.hasPermission.mockResolvedValue(true);
      deliveriesRepository.list.mockResolvedValue([{ id: "d1" }]);

      const result = await service.list(auth, { status: "assigned" });

      expect(deliveriesRepository.list).toHaveBeenCalledWith(fakeTx, "c1", { status: "assigned" });
      expect(result).toEqual([{ id: "d1" }]);
    });

    it("ruxsat bo'lmasa faqat o'z (kuryer) dostavkalarini qaytaradi", async () => {
      rolesRepository.hasPermission.mockResolvedValue(false);
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });
      deliveriesRepository.list.mockResolvedValue([]);

      await service.list(auth, {});

      expect(deliveriesRepository.list).toHaveBeenCalledWith(fakeTx, "c1", {
        courierMemberId: "m1",
      });
    });

    it("a'zolik topilmasa bo'sh ro'yxat qaytaradi", async () => {
      rolesRepository.hasPermission.mockResolvedValue(false);
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue(null);

      const result = await service.list(auth, {});

      expect(result).toEqual([]);
      expect(deliveriesRepository.list).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("boshqa kompaniya dostavkasi bo'lsa NotFoundError", async () => {
      deliveriesRepository.findById.mockResolvedValue({ id: "d1", companyId: "c2" });

      await expect(service.getById(auth, "d1")).rejects.toThrow(NotFoundError);
    });

    it("egasi bo'lmagan kuryer boshqa kuryer dostavkasini ko'ra olmaydi", async () => {
      deliveriesRepository.findById.mockResolvedValue({
        id: "d1",
        companyId: "c1",
        courierMemberId: "other",
      });
      rolesRepository.hasPermission.mockResolvedValue(false);
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });

      await expect(service.getById(auth, "d1")).rejects.toThrow(NotFoundError);
    });

    it("o'z dostavkasini ko'radi", async () => {
      const delivery = { id: "d1", companyId: "c1", courierMemberId: "m1" };
      deliveriesRepository.findById.mockResolvedValue(delivery);
      rolesRepository.hasPermission.mockResolvedValue(false);
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });

      const result = await service.getById(auth, "d1");

      expect(result).toBe(delivery);
    });
  });

  describe("deliverStop", () => {
    function buildDelivery(overrides = {}) {
      return {
        id: "d1",
        companyId: "c1",
        courierMemberId: "m1",
        orders: [
          {
            id: "do1",
            orderId: "o1",
            deliveredAt: null,
            order: { status: "shipped", total: 100 },
          },
          {
            id: "do2",
            orderId: "o2",
            deliveredAt: new Date("2026-01-01"),
            order: { status: "delivered", total: 50 },
          },
        ],
        ...overrides,
      };
    }

    it("boshqa kuryer chaqirsa NotFoundError", async () => {
      deliveriesRepository.findById.mockResolvedValue(buildDelivery());
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "other" });

      await expect(service.deliverStop(auth, "d1", "o1", {})).rejects.toThrow(NotFoundError);
    });

    it("bekat topilmasa NotFoundError", async () => {
      deliveriesRepository.findById.mockResolvedValue(buildDelivery());
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });

      await expect(service.deliverStop(auth, "d1", "unknown", {})).rejects.toThrow(NotFoundError);
    });

    it("allaqachon yetkazilgan bekat uchun ConflictError", async () => {
      deliveriesRepository.findById.mockResolvedValue(buildDelivery());
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });

      await expect(service.deliverStop(auth, "d1", "o2", {})).rejects.toThrow(ConflictError);
    });

    it("to'g'ri holatda order'ni delivered qiladi, acceptCode beradi, naqd qo'shadi", async () => {
      deliveriesRepository.findById.mockResolvedValue(buildDelivery());
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });
      deliveriesRepository.updateOrderStop.mockResolvedValue({ id: "do1", acceptCode: "1234" });

      const result = await service.deliverStop(auth, "d1", "o1", {});

      expect(deliveriesRepository.updateOrderStop).toHaveBeenCalledWith(
        fakeTx,
        "do1",
        expect.objectContaining({ deliveredAt: expect.any(Date), acceptCode: expect.any(String) }),
      );
      expect(ordersRepository.update).toHaveBeenCalledWith(fakeTx, "o1", { status: "delivered" });
      expect(deliveriesRepository.incrementCashCollected).toHaveBeenCalledWith(fakeTx, "d1", 100);
      expect(result).toEqual({ id: "do1", acceptCode: "1234" });
    });

    it("ixtiyoriy cashCollected berilsa shu summa ishlatiladi", async () => {
      deliveriesRepository.findById.mockResolvedValue(buildDelivery());
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });
      deliveriesRepository.updateOrderStop.mockResolvedValue({ id: "do1" });

      await service.deliverStop(auth, "d1", "o1", { cashCollected: 80 });

      expect(deliveriesRepository.incrementCashCollected).toHaveBeenCalledWith(fakeTx, "d1", 80);
    });

    it("oxirgi ochiq bekat yopilsa Delivery'ni done qiladi", async () => {
      const delivery = buildDelivery({
        orders: [
          {
            id: "do1",
            orderId: "o1",
            deliveredAt: null,
            order: { status: "shipped", total: 100 },
          },
        ],
      });
      deliveriesRepository.findById.mockResolvedValue(delivery);
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });
      deliveriesRepository.updateOrderStop.mockResolvedValue({ id: "do1" });

      await service.deliverStop(auth, "d1", "o1", {});

      expect(deliveriesRepository.update).toHaveBeenCalledWith(
        fakeTx,
        "d1",
        expect.objectContaining({ status: "done", closedAt: expect.any(Date) }),
      );
    });

    it("boshqa bekat ochiq bo'lsa Delivery'ni done qilmaydi", async () => {
      deliveriesRepository.findById.mockResolvedValue(
        buildDelivery({
          orders: [
            {
              id: "do1",
              orderId: "o1",
              deliveredAt: null,
              order: { status: "shipped", total: 100 },
            },
            {
              id: "do3",
              orderId: "o3",
              deliveredAt: null,
              order: { status: "shipped", total: 30 },
            },
          ],
        }),
      );
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });
      deliveriesRepository.updateOrderStop.mockResolvedValue({ id: "do1" });

      await service.deliverStop(auth, "d1", "o1", {});

      expect(deliveriesRepository.update).not.toHaveBeenCalled();
    });
  });
});
