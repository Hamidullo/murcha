import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("sendWebPush", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  const subscription = { endpoint: "https://push.example/1", keys: { p256dh: "p", auth: "a" } };

  it("VAPID kalitlar sozlanmagan bo'lsa faqat logga yozadi, sendNotification chaqirmaydi", async () => {
    const warn = vi.fn();
    vi.doMock("./logger.js", () => ({ logger: { warn, error: vi.fn() } }));
    const sendNotification = vi.fn();
    vi.doMock("web-push", () => ({
      default: { setVapidDetails: vi.fn(), sendNotification },
    }));

    const { sendWebPush } = await import("./web-push.js");
    const result = await sendWebPush(subscription, { title: "Test" });

    expect(warn).toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
    expect(result).toEqual({ expired: false });
  });

  it("VAPID kalitlar sozlangan bo'lsa setVapidDetails va sendNotification chaqiradi", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    vi.doMock("./logger.js", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
    const setVapidDetails = vi.fn();
    const sendNotification = vi.fn().mockResolvedValue({});
    vi.doMock("web-push", () => ({ default: { setVapidDetails, sendNotification } }));

    const { sendWebPush } = await import("./web-push.js");
    const result = await sendWebPush(subscription, { title: "Test" });

    expect(setVapidDetails).toHaveBeenCalledWith("mailto:support@murcha.uz", "pub", "priv");
    expect(sendNotification).toHaveBeenCalledWith(subscription, JSON.stringify({ title: "Test" }));
    expect(result).toEqual({ expired: false });
  });

  it("410/404 xato bo'lsa expired:true qaytaradi, log yozmaydi", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    const error = vi.fn();
    vi.doMock("./logger.js", () => ({ logger: { warn: vi.fn(), error } }));
    const sendNotification = vi.fn().mockRejectedValue({ statusCode: 410 });
    vi.doMock("web-push", () => ({
      default: { setVapidDetails: vi.fn(), sendNotification },
    }));

    const { sendWebPush } = await import("./web-push.js");
    const result = await sendWebPush(subscription, { title: "Test" });

    expect(result).toEqual({ expired: true });
    expect(error).not.toHaveBeenCalled();
  });

  it("boshqa xato bo'lsa logga yozadi, otilmaydi, expired:false qaytaradi", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    const error = vi.fn();
    vi.doMock("./logger.js", () => ({ logger: { warn: vi.fn(), error } }));
    const sendNotification = vi.fn().mockRejectedValue({ statusCode: 500 });
    vi.doMock("web-push", () => ({
      default: { setVapidDetails: vi.fn(), sendNotification },
    }));

    const { sendWebPush } = await import("./web-push.js");
    const result = await sendWebPush(subscription, { title: "Test" });

    expect(result).toEqual({ expired: false });
    expect(error).toHaveBeenCalled();
  });
});
