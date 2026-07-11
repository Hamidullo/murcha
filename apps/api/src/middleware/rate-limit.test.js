import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeRedis = { incr: vi.fn(), expire: vi.fn().mockResolvedValue(undefined) };
vi.mock("../lib/redis.js", () => ({ redis: fakeRedis }));

const { rateLimit } = await import("./rate-limit.js");
const { TooManyRequestsError } = await import("../lib/errors.js");

describe("rateLimit", () => {
  beforeEach(() => {
    fakeRedis.incr.mockReset();
    fakeRedis.expire.mockClear();
  });

  it("birinchi so'rovda kalitga TTL o'rnatadi, next()ni xatosiz chaqiradi", async () => {
    fakeRedis.incr.mockResolvedValue(1);
    const req = { ip: "1.2.3.4" };
    const next = vi.fn();

    await rateLimit({ windowSeconds: 60, max: 5, keyPrefix: "test" })(req, {}, next);

    expect(fakeRedis.incr).toHaveBeenCalledWith("test:1.2.3.4");
    expect(fakeRedis.expire).toHaveBeenCalledWith("test:1.2.3.4", 60);
    expect(next).toHaveBeenCalledWith();
  });

  it("limitdan oshmagan keyingi so'rovlarda TTL qayta o'rnatmaydi", async () => {
    fakeRedis.incr.mockResolvedValue(3);
    const next = vi.fn();

    await rateLimit({ windowSeconds: 60, max: 5, keyPrefix: "test" })({ ip: "1.2.3.4" }, {}, next);

    expect(fakeRedis.expire).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("limitdan oshsa TooManyRequestsError bilan next() chaqiradi", async () => {
    fakeRedis.incr.mockResolvedValue(6);
    const next = vi.fn();

    await rateLimit({ windowSeconds: 60, max: 5, keyPrefix: "test" })({ ip: "1.2.3.4" }, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(TooManyRequestsError);
  });

  it("redis xato otsa next(err) chaqiradi", async () => {
    const err = new Error("redis down");
    fakeRedis.incr.mockRejectedValue(err);
    const next = vi.fn();

    await rateLimit({ windowSeconds: 60, max: 5, keyPrefix: "test" })({ ip: "1.2.3.4" }, {}, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
