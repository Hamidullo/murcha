import { describe, it, expect, vi, beforeEach } from "vitest";

const executeRaw = vi.fn().mockResolvedValue(undefined);
const fakeTx = { $executeRaw: executeRaw };
const bypassTx = { $executeRaw: executeRaw };

vi.mock("./prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(fakeTx)),
  },
  prismaBypass: {
    $transaction: vi.fn((callback) => callback(bypassTx)),
  },
}));

const { withTenant, withUserContext, withoutTenant, withBypass } =
  await import("./tenant-context.js");
const { prisma, prismaBypass } = await import("./prisma.js");

describe("withTenant", () => {
  beforeEach(() => {
    executeRaw.mockClear();
  });

  it("userId berilmasa faqat company_id'ni set_config qiladi", async () => {
    const callback = vi.fn().mockResolvedValue("natija");

    const result = await withTenant("company-123", null, callback);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(fakeTx);
    expect(result).toBe("natija");
  });

  it("userId berilsa ikkalasini ham set_config qiladi", async () => {
    const callback = vi.fn().mockResolvedValue("natija");

    await withTenant("company-123", "user-456", callback);

    expect(executeRaw).toHaveBeenCalledTimes(2);
  });
});

describe("withUserContext", () => {
  beforeEach(() => {
    executeRaw.mockClear();
  });

  it("faqat user_id'ni set_config qiladi, callback'ni tx bilan bajaradi", async () => {
    const callback = vi.fn().mockResolvedValue("natija");

    const result = await withUserContext("user-456", callback);

    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(fakeTx);
    expect(result).toBe("natija");
  });
});

describe("withoutTenant", () => {
  beforeEach(() => {
    executeRaw.mockClear();
  });

  it("hech qanday set_config qilmaydi, callback'ni tx bilan bajaradi", async () => {
    const callback = vi.fn().mockResolvedValue("natija");

    const result = await withoutTenant(callback);

    expect(executeRaw).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(fakeTx);
    expect(result).toBe("natija");
  });

  it("ODDIY (murcha_app) client'da ishlaydi — RLS'ni chetlab o'tmaydi", async () => {
    await withoutTenant(vi.fn().mockResolvedValue(null));

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prismaBypass.$transaction).not.toHaveBeenCalled();
  });
});

describe("withBypass", () => {
  beforeEach(() => {
    executeRaw.mockClear();
    prismaBypass.$transaction.mockClear();
    prisma.$transaction.mockClear();
  });

  it("BYPASS (owner) client'ida ishlaydi, set_config qilmaydi", async () => {
    const callback = vi.fn().mockResolvedValue("natija");

    const result = await withBypass(callback);

    // Muhim: oddiy client ISHLATILMAYDI — aks holda cross-tenant so'rov
    // RLS'ga urilib bo'sh natija qaytarardi (platform paneli bo'sh chiqardi).
    expect(prismaBypass.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(executeRaw).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(bypassTx);
    expect(result).toBe("natija");
  });
});
