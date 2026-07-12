import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("sendSms", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ESKIZ_EMAIL;
    delete process.env.ESKIZ_PASSWORD;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("ESKIZ_EMAIL/ESKIZ_PASSWORD sozlanmagan bo'lsa faqat logga yozadi, fetch chaqirmaydi", async () => {
    const warn = vi.fn();
    vi.doMock("./logger.js", () => ({ logger: { warn, error: vi.fn() } }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { sendSms } = await import("./sms.js");
    await sendSms("+998901234567", "Salom");

    expect(warn).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("token keshlangan bo'lsa qayta login qilmaydi, to'g'ridan-to'g'ri yuboradi", async () => {
    process.env.ESKIZ_EMAIL = "test@eskiz.uz";
    process.env.ESKIZ_PASSWORD = "secret";
    vi.doMock("./logger.js", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
    vi.doMock("./redis.js", () => ({
      redis: { get: vi.fn().mockResolvedValue("cached-token"), set: vi.fn() },
    }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { sendSms } = await import("./sms.js");
    await sendSms("+998901234567", "Salom");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/message/sms/send");
    expect(options.headers.Authorization).toBe("Bearer cached-token");
  });

  it("token keshlanmagan bo'lsa avval login qiladi, keyin yuboradi va keshlaydi", async () => {
    process.env.ESKIZ_EMAIL = "test@eskiz.uz";
    process.env.ESKIZ_PASSWORD = "secret";
    vi.doMock("./logger.js", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
    const redisSet = vi.fn();
    vi.doMock("./redis.js", () => ({
      redis: { get: vi.fn().mockResolvedValue(null), set: redisSet },
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { token: "new-token" } }) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { sendSms } = await import("./sms.js");
    await sendSms("+998901234567", "Salom");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("/auth/login");
    expect(redisSet).toHaveBeenCalledWith("eskiz:token", "new-token", "EX", 29 * 24 * 60 * 60);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer new-token");
  });

  it("yuborishda xato bo'lsa logga yozadi, otilmaydi", async () => {
    process.env.ESKIZ_EMAIL = "test@eskiz.uz";
    process.env.ESKIZ_PASSWORD = "secret";
    const error = vi.fn();
    vi.doMock("./logger.js", () => ({ logger: { warn: vi.fn(), error } }));
    vi.doMock("./redis.js", () => ({
      redis: { get: vi.fn().mockResolvedValue("cached-token"), set: vi.fn() },
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, text: async () => "server error" });
    vi.stubGlobal("fetch", fetchMock);

    const { sendSms } = await import("./sms.js");
    await expect(sendSms("+998901234567", "Salom")).resolves.toBeUndefined();

    expect(error).toHaveBeenCalled();
  });
});
