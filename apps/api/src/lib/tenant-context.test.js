import { describe, it, expect, vi, beforeEach } from "vitest";

const executeRaw = vi.fn().mockResolvedValue(undefined);
const fakeTx = { $executeRaw: executeRaw };

vi.mock("./prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(fakeTx)),
  },
}));

const { withTenant, withUserContext, withoutTenant } = await import("./tenant-context.js");
const { prisma } = await import("./prisma.js");

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
});
