import { describe, it, expect, vi } from "vitest";
import { LoginAttemptsRepository } from "./login-attempts.repository.js";

function makeFakeRedis() {
  return {
    incr: vi.fn(),
    expire: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    del: vi.fn().mockResolvedValue(undefined),
  };
}

describe("LoginAttemptsRepository", () => {
  it("recordFailure — birinchi urinishda TTL o'rnatadi", async () => {
    const redis = makeFakeRedis();
    redis.incr.mockResolvedValue(1);
    const repo = new LoginAttemptsRepository(redis);

    const count = await repo.recordFailure("+998901234567");

    expect(redis.incr).toHaveBeenCalledWith("login_fail:+998901234567");
    expect(redis.expire).toHaveBeenCalledWith("login_fail:+998901234567", expect.any(Number));
    expect(count).toBe(1);
  });

  it("recordFailure — keyingi urinishlarda TTL qayta o'rnatmaydi", async () => {
    const redis = makeFakeRedis();
    redis.incr.mockResolvedValue(3);
    const repo = new LoginAttemptsRepository(redis);

    await repo.recordFailure("+998901234567");

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("getFailureCount — kalit yo'q bo'lsa 0 qaytaradi", async () => {
    const redis = makeFakeRedis();
    redis.get.mockResolvedValue(null);
    const repo = new LoginAttemptsRepository(redis);

    await expect(repo.getFailureCount("+998901234567")).resolves.toBe(0);
  });

  it("getFailureCount — sonni qaytaradi", async () => {
    const redis = makeFakeRedis();
    redis.get.mockResolvedValue("4");
    const repo = new LoginAttemptsRepository(redis);

    await expect(repo.getFailureCount("+998901234567")).resolves.toBe(4);
  });

  it("reset — kalitni o'chiradi", async () => {
    const redis = makeFakeRedis();
    const repo = new LoginAttemptsRepository(redis);

    await repo.reset("+998901234567");

    expect(redis.del).toHaveBeenCalledWith("login_fail:+998901234567");
  });
});
