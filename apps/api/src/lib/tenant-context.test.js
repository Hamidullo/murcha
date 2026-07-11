import { describe, it, expect, vi } from "vitest";

const executeRaw = vi.fn().mockResolvedValue(undefined);
const fakeTx = { $executeRaw: executeRaw };

vi.mock("./prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(fakeTx)),
  },
}));

const { withTenant } = await import("./tenant-context.js");
const { prisma } = await import("./prisma.js");

describe("withTenant", () => {
  it("set_config'ni company_id bilan chaqiradi, keyin callback'ni tx bilan bajaradi", async () => {
    const callback = vi.fn().mockResolvedValue("natija");

    const result = await withTenant("company-123", callback);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(fakeTx);
    expect(result).toBe("natija");
  });
});
