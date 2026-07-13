import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  company: { findUnique: vi.fn() },
  priceType: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
  productPrice: { findMany: vi.fn() },
  productImage: { findMany: vi.fn() },
  lead: { create: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const presignedGetObject = vi.fn();
vi.mock("../../lib/minio.js", () => ({
  minioClient: { presignedGetObject: (...args) => presignedGetObject(...args) },
  MINIO_BUCKET: "murcha-test",
}));

const domainEvents = { emit: vi.fn(), on: vi.fn() };
vi.mock("../../lib/events.js", () => ({ domainEvents }));

const fakeRedis = {
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(undefined),
};
vi.mock("../../lib/redis.js", () => ({ redis: fakeRedis }));

const { createApp } = await import("../../app.js");

function resetFakeTx() {
  for (const model of Object.values(fakeTx)) {
    if (typeof model !== "object") continue;
    for (const fn of Object.values(model)) {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    }
  }
  domainEvents.emit.mockReset();
}

describe("GET /api/v1/showcase/:slug", () => {
  beforeEach(() => resetFakeTx());

  it("vitrina yoqilmagan/topilmagan bo'lsa 404 qaytaradi", async () => {
    fakeTx.company.findUnique.mockResolvedValue(null);

    const res = await request(createApp()).get("/api/v1/showcase/noexist");

    expect(res.status).toBe(404);
  });

  it("vitrina yoqilgan bo'lsa 200 va HTML qaytaradi (autentifikatsiyasiz)", async () => {
    fakeTx.company.findUnique.mockResolvedValue({
      id: "c1",
      name: "Test Sklad",
      slug: "test-sklad",
      brandColor: "#f59e0b",
      logoPath: null,
      showcaseSettings: { enabled: true, priceTypeId: "pt1" },
    });
    fakeTx.priceType.findMany.mockResolvedValue([{ id: "pt1", isDefault: true }]);
    fakeTx.product.findMany.mockResolvedValue([
      { id: "p1", nameUz: "Non", nameRu: null, status: "active" },
    ]);
    fakeTx.productPrice.findMany.mockResolvedValue([
      { priceTypeId: "pt1", price: 5000, currency: "UZS" },
    ]);
    fakeTx.productImage.findMany.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/v1/showcase/test-sklad");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("Test Sklad");
    expect(res.text).toContain("Non");
  });
});

describe("POST /api/v1/showcase/:slug/leads", () => {
  beforeEach(() => resetFakeTx());

  it("noto'g'ri body bilan 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/showcase/test-sklad/leads")
      .send({ name: "A" });

    expect(res.status).toBe(400);
  });

  it("to'g'ri body bilan lid yaratadi va 201 qaytaradi", async () => {
    fakeTx.company.findUnique.mockResolvedValue({
      id: "c1",
      showcaseSettings: { enabled: true },
    });
    fakeTx.lead.create.mockResolvedValue({
      id: "lead1",
      companyId: "c1",
      name: "Ali",
      phone: "+998901234567",
      status: "new",
    });

    const res = await request(createApp())
      .post("/api/v1/showcase/test-sklad/leads")
      .send({ name: "Ali", phone: "+998901234567" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "lead1", status: "new" });
    expect(domainEvents.emit).toHaveBeenCalledWith(
      "lead.new",
      expect.objectContaining({
        companyId: "c1",
        leadId: "lead1",
      }),
    );
  });
});
