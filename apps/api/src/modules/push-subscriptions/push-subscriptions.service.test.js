import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withoutTenant = vi.fn((callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withoutTenant }));

const { PushSubscriptionsService } = await import("./push-subscriptions.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("PushSubscriptionsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let pushSubscriptionsRepository;
  let service;

  beforeEach(() => {
    withoutTenant.mockClear();
    pushSubscriptionsRepository = {
      upsert: vi.fn(),
      findById: vi.fn(),
      remove: vi.fn(),
    };
    service = new PushSubscriptionsService({ pushSubscriptionsRepository });
  });

  describe("subscribe", () => {
    it("repository.upsert'ni auth.userId va dto bilan chaqiradi", async () => {
      const dto = { endpoint: "https://push.example/1", keys: { p256dh: "p", auth: "a" } };
      pushSubscriptionsRepository.upsert.mockResolvedValue({ id: "ps1" });

      const result = await service.subscribe(auth, dto);

      expect(pushSubscriptionsRepository.upsert).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          userId: "u1",
          endpoint: "https://push.example/1",
          p256dh: "p",
          auth: "a",
        }),
      );
      expect(result).toEqual({ id: "ps1" });
    });
  });

  describe("unsubscribe", () => {
    it("obuna topilmasa NotFoundError otadi", async () => {
      pushSubscriptionsRepository.findById.mockResolvedValue(null);

      await expect(service.unsubscribe(auth, "ps1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("boshqa foydalanuvchining obunasi bo'lsa NotFoundError otadi", async () => {
      pushSubscriptionsRepository.findById.mockResolvedValue({ id: "ps1", userId: "u2" });

      await expect(service.unsubscribe(auth, "ps1")).rejects.toBeInstanceOf(NotFoundError);
      expect(pushSubscriptionsRepository.remove).not.toHaveBeenCalled();
    });

    it("o'z obunasini o'chiradi", async () => {
      pushSubscriptionsRepository.findById.mockResolvedValue({ id: "ps1", userId: "u1" });

      await service.unsubscribe(auth, "ps1");

      expect(pushSubscriptionsRepository.remove).toHaveBeenCalledWith(fakeTx, "ps1");
    });
  });
});
