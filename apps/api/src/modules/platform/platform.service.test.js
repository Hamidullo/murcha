import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withoutTenant = vi.fn((callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withoutTenant }));

const { PlatformService } = await import("./platform.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("PlatformService", () => {
  let platformRepository;
  let service;

  beforeEach(() => {
    withoutTenant.mockClear();
    platformRepository = {
      listCompanies: vi.fn(),
      getCompany: vi.fn(),
      upsertSubscription: vi.fn(),
    };
    service = new PlatformService({ platformRepository });
  });

  describe("listCompanies", () => {
    it("withoutTenant orqali repository.listCompanies'ni chaqiradi", async () => {
      platformRepository.listCompanies.mockResolvedValue([{ id: "c1" }]);

      const result = await service.listCompanies({ search: "Murcha" });

      expect(withoutTenant).toHaveBeenCalledTimes(1);
      expect(platformRepository.listCompanies).toHaveBeenCalledWith(fakeTx, { search: "Murcha" });
      expect(result).toEqual([{ id: "c1" }]);
    });
  });

  describe("getCompany", () => {
    it("topilmasa NotFoundError otadi", async () => {
      platformRepository.getCompany.mockResolvedValue(null);

      await expect(service.getCompany("c1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("topsa qaytaradi", async () => {
      platformRepository.getCompany.mockResolvedValue({ id: "c1" });

      const result = await service.getCompany("c1");

      expect(result).toEqual({ id: "c1" });
    });
  });

  describe("updateSubscription", () => {
    it("kompaniya topilmasa NotFoundError otadi", async () => {
      platformRepository.getCompany.mockResolvedValue(null);

      await expect(service.updateSubscription("c1", { plan: "start" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(platformRepository.upsertSubscription).not.toHaveBeenCalled();
    });

    it("kompaniya topilsa upsertSubscription'ni id+dto bilan chaqiradi", async () => {
      platformRepository.getCompany.mockResolvedValue({ id: "c1" });
      platformRepository.upsertSubscription.mockResolvedValue({ id: "s1", plan: "start" });

      const result = await service.updateSubscription("c1", { plan: "start" });

      expect(platformRepository.upsertSubscription).toHaveBeenCalledWith(fakeTx, "c1", {
        id: expect.any(String),
        plan: "start",
      });
      expect(result).toEqual({ id: "s1", plan: "start" });
    });
  });
});
