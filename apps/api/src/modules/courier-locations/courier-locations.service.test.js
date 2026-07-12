import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { CourierLocationsService } = await import("./courier-locations.service.js");

describe("CourierLocationsService", () => {
  const auth = { userId: "u1", companyId: "c1" };
  let courierLocationsRepository;
  let companyMembersRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    courierLocationsRepository = { create: vi.fn(), deleteOlderThan: vi.fn() };
    companyMembersRepository = { findByCompanyAndUser: vi.fn() };
    service = new CourierLocationsService({ courierLocationsRepository, companyMembersRepository });
  });

  it("a'zolik topilmasa null qaytaradi, yozuv yaratmaydi", async () => {
    companyMembersRepository.findByCompanyAndUser.mockResolvedValue(null);

    const result = await service.record(auth, { lat: 41.3, lng: 69.2 });

    expect(result).toBeNull();
    expect(courierLocationsRepository.create).not.toHaveBeenCalled();
  });

  it("koordinatani yozadi va shu kompaniya doirasida eskilarni tozalaydi", async () => {
    companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "m1" });
    courierLocationsRepository.create.mockResolvedValue({
      lat: 41.3,
      lng: 69.2,
      recordedAt: new Date("2026-07-12"),
    });

    const result = await service.record(auth, { lat: 41.3, lng: 69.2 });

    expect(courierLocationsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ companyId: "c1", courierMemberId: "m1", lat: 41.3, lng: 69.2 }),
    );
    expect(courierLocationsRepository.deleteOlderThan).toHaveBeenCalledWith(
      fakeTx,
      "c1",
      expect.any(Date),
    );
    expect(result).toEqual({
      courierMemberId: "m1",
      lat: 41.3,
      lng: 69.2,
      recordedAt: new Date("2026-07-12"),
    });
  });
});
