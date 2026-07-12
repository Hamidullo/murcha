import { describe, it, expect, vi } from "vitest";
import { PasswordResetRepository } from "./password-reset.repository.js";

describe("PasswordResetRepository", () => {
  it("createToken — Redis'ga 24 soatlik TTL bilan yozadi", async () => {
    const redis = { set: vi.fn().mockResolvedValue("OK") };
    const repo = new PasswordResetRepository(redis);

    const token = await repo.createToken("u1");

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);
    expect(redis.set).toHaveBeenCalledWith(`pwreset:${token}`, "u1", "EX", 24 * 60 * 60);
  });

  it("consumeToken — topilsa userId qaytaradi va kalitni o'chiradi", async () => {
    const redis = { get: vi.fn().mockResolvedValue("u1"), del: vi.fn().mockResolvedValue(1) };
    const repo = new PasswordResetRepository(redis);

    const result = await repo.consumeToken("tok1");

    expect(redis.get).toHaveBeenCalledWith("pwreset:tok1");
    expect(redis.del).toHaveBeenCalledWith("pwreset:tok1");
    expect(result).toBe("u1");
  });

  it("consumeToken — topilmasa null qaytaradi, o'chirishga urinmaydi", async () => {
    const redis = { get: vi.fn().mockResolvedValue(null), del: vi.fn() };
    const repo = new PasswordResetRepository(redis);

    const result = await repo.consumeToken("tok1");

    expect(result).toBeNull();
    expect(redis.del).not.toHaveBeenCalled();
  });
});
