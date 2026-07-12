import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { PaymentsService } = await import("./payments.service.js");
const { NotFoundError, ForbiddenError, ValidationError } = await import("../../lib/errors.js");

describe("PaymentsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let paymentsRepository;
  let debtMovementsRepository;
  let counterpartiesRepository;
  let rolesRepository;
  let service;

  const dto = { counterpartyId: "cp1", amount: 1000, currency: "UZS", method: "cash" };

  beforeEach(() => {
    withTenant.mockClear();
    paymentsRepository = { create: vi.fn(), addAllocation: vi.fn() };
    debtMovementsRepository = {
      create: vi.fn(),
      listOrderLinkedMovements: vi.fn().mockResolvedValue([]),
    };
    counterpartiesRepository = { findById: vi.fn() };
    rolesRepository = { hasPermission: vi.fn() };
    service = new PaymentsService({
      paymentsRepository,
      debtMovementsRepository,
      counterpartiesRepository,
      rolesRepository,
    });
  });

  it("ruxsat yo'q bo'lsa ForbiddenError otadi", async () => {
    rolesRepository.hasPermission.mockResolvedValue(false);

    await expect(service.create(auth, dto)).rejects.toThrow(ForbiddenError);
  });

  it("kontragent topilmasa NotFoundError otadi", async () => {
    rolesRepository.hasPermission.mockResolvedValue(true);
    counterpartiesRepository.findById.mockResolvedValue(null);

    await expect(service.create(auth, dto)).rejects.toThrow(NotFoundError);
  });

  it("allocations berilmasa FIFO — eng eski dueDate'dan boshlab taqsimlaydi", async () => {
    rolesRepository.hasPermission.mockResolvedValue(true);
    counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
    paymentsRepository.create.mockResolvedValue({ id: "pay1" });
    debtMovementsRepository.listOrderLinkedMovements.mockResolvedValue([
      {
        orderId: "o-new",
        counterpartyId: "cp1",
        amount: 400,
        currency: "UZS",
        dueDate: new Date("2026-08-01"),
      },
      {
        orderId: "o-old",
        counterpartyId: "cp1",
        amount: 700,
        currency: "UZS",
        dueDate: new Date("2026-06-01"),
      },
    ]);

    await service.create(auth, dto);

    expect(paymentsRepository.addAllocation).toHaveBeenNthCalledWith(
      1,
      fakeTx,
      expect.objectContaining({ orderId: "o-old", amount: 700 }),
    );
    expect(paymentsRepository.addAllocation).toHaveBeenNthCalledWith(
      2,
      fakeTx,
      expect.objectContaining({ orderId: "o-new", amount: 300 }),
    );
    expect(debtMovementsRepository.create).toHaveBeenCalledTimes(2);
    expect(debtMovementsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({
        type: "payment",
        orderId: "o-old",
        amount: -700,
        paymentId: "pay1",
      }),
    );
  });

  it("to'lov ochiq qarzdan katta bo'lsa qoldiq orderId:null bilan yoziladi", async () => {
    rolesRepository.hasPermission.mockResolvedValue(true);
    counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
    paymentsRepository.create.mockResolvedValue({ id: "pay1" });
    debtMovementsRepository.listOrderLinkedMovements.mockResolvedValue([
      {
        orderId: "o1",
        counterpartyId: "cp1",
        amount: 300,
        currency: "UZS",
        dueDate: new Date("2026-06-01"),
      },
    ]);

    await service.create(auth, dto);

    expect(debtMovementsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ orderId: "o1", amount: -300 }),
    );
    expect(debtMovementsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ orderId: null, amount: -700 }),
    );
  });

  it("qo'lda taqsimlashda noma'lum orderId bo'lsa NotFoundError otadi", async () => {
    rolesRepository.hasPermission.mockResolvedValue(true);
    counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
    paymentsRepository.create.mockResolvedValue({ id: "pay1" });
    debtMovementsRepository.listOrderLinkedMovements.mockResolvedValue([]);

    await expect(
      service.create(auth, { ...dto, allocations: [{ orderId: "o1", amount: 100 }] }),
    ).rejects.toThrow(NotFoundError);
  });

  it("qo'lda taqsimlashda ochiq qoldiqdan ko'p bo'lsa ValidationError otadi", async () => {
    rolesRepository.hasPermission.mockResolvedValue(true);
    counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
    paymentsRepository.create.mockResolvedValue({ id: "pay1" });
    debtMovementsRepository.listOrderLinkedMovements.mockResolvedValue([
      { orderId: "o1", counterpartyId: "cp1", amount: 100, currency: "UZS", dueDate: null },
    ]);

    await expect(
      service.create(auth, { ...dto, allocations: [{ orderId: "o1", amount: 500 }] }),
    ).rejects.toThrow(ValidationError);
  });

  it("qo'lda taqsimlash yig'indisi to'lov summasidan ko'p bo'lsa ValidationError otadi", async () => {
    rolesRepository.hasPermission.mockResolvedValue(true);
    counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
    paymentsRepository.create.mockResolvedValue({ id: "pay1" });
    debtMovementsRepository.listOrderLinkedMovements.mockResolvedValue([
      { orderId: "o1", counterpartyId: "cp1", amount: 2000, currency: "UZS", dueDate: null },
      { orderId: "o2", counterpartyId: "cp1", amount: 2000, currency: "UZS", dueDate: null },
    ]);

    await expect(
      service.create(auth, {
        ...dto,
        allocations: [
          { orderId: "o1", amount: 600 },
          { orderId: "o2", amount: 600 },
        ],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("to'g'ri qo'lda taqsimlashda allocation + debt_movement yoziladi", async () => {
    rolesRepository.hasPermission.mockResolvedValue(true);
    counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
    paymentsRepository.create.mockResolvedValue({ id: "pay1" });
    debtMovementsRepository.listOrderLinkedMovements.mockResolvedValue([
      { orderId: "o1", counterpartyId: "cp1", amount: 2000, currency: "UZS", dueDate: null },
    ]);

    await service.create(auth, { ...dto, allocations: [{ orderId: "o1", amount: 1000 }] });

    expect(paymentsRepository.addAllocation).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ orderId: "o1", amount: 1000 }),
    );
    expect(debtMovementsRepository.create).toHaveBeenCalledTimes(1);
    expect(debtMovementsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ type: "payment", orderId: "o1", amount: -1000 }),
    );
  });
});
