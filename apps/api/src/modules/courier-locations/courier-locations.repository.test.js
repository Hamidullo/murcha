import { describe, it, expect, vi } from "vitest";
import { CourierLocationsRepository } from "./courier-locations.repository.js";

describe("CourierLocationsRepository", () => {
  it("create — tx.courierLocation.create'ni data bilan chaqiradi", async () => {
    const data = { id: "l1", companyId: "c1", courierMemberId: "m1", lat: 41.3, lng: 69.2 };
    const tx = { courierLocation: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new CourierLocationsRepository();

    const result = await repo.create(tx, data);

    expect(tx.courierLocation.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("deleteOlderThan — companyId+cutoff bo'yicha tx.courierLocation.deleteMany'ni chaqiradi", async () => {
    const cutoff = new Date("2026-01-01");
    const tx = { courierLocation: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) } };
    const repo = new CourierLocationsRepository();

    const result = await repo.deleteOlderThan(tx, "c1", cutoff);

    expect(tx.courierLocation.deleteMany).toHaveBeenCalledWith({
      where: { companyId: "c1", recordedAt: { lt: cutoff } },
    });
    expect(result).toEqual({ count: 3 });
  });
});
