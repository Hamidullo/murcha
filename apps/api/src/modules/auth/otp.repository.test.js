import { describe, it, expect, vi } from "vitest";
import { OtpRepository } from "./otp.repository.js";

describe("OtpRepository", () => {
  it("create — 6 xonali kod yaratadi, Redis hash'ga 3 daqiqa TTL bilan yozadi", async () => {
    const redis = { hset: vi.fn().mockResolvedValue(1), expire: vi.fn().mockResolvedValue(1) };
    const repo = new OtpRepository(redis);

    const code = await repo.create("+998901234567");

    expect(code).toMatch(/^\d{6}$/);
    expect(redis.hset).toHaveBeenCalledWith("otp:+998901234567", { code, attempts: "0" });
    expect(redis.expire).toHaveBeenCalledWith("otp:+998901234567", 180);
  });

  it("get — mavjud bo'lsa code/attempts qaytaradi", async () => {
    const redis = { hgetall: vi.fn().mockResolvedValue({ code: "123456", attempts: "1" }) };
    const repo = new OtpRepository(redis);

    const result = await repo.get("+998901234567");

    expect(redis.hgetall).toHaveBeenCalledWith("otp:+998901234567");
    expect(result).toEqual({ code: "123456", attempts: 1 });
  });

  it("get — topilmasa null qaytaradi", async () => {
    const redis = { hgetall: vi.fn().mockResolvedValue({}) };
    const repo = new OtpRepository(redis);

    const result = await repo.get("+998901234567");

    expect(result).toBeNull();
  });

  it("incrementAttempts — hincrby'ni chaqiradi", async () => {
    const redis = { hincrby: vi.fn().mockResolvedValue(1) };
    const repo = new OtpRepository(redis);

    await repo.incrementAttempts("+998901234567");

    expect(redis.hincrby).toHaveBeenCalledWith("otp:+998901234567", "attempts", 1);
  });

  it("delete — kalitni o'chiradi", async () => {
    const redis = { del: vi.fn().mockResolvedValue(1) };
    const repo = new OtpRepository(redis);

    await repo.delete("+998901234567");

    expect(redis.del).toHaveBeenCalledWith("otp:+998901234567");
  });
});
