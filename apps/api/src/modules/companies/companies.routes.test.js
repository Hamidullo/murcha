import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  company: { findUnique: vi.fn(), update: vi.fn() },
  rolePermission: { findFirst: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const putObject = vi.fn();
vi.mock("../../lib/minio.js", () => ({
  minioClient: { putObject: (...args) => putObject(...args), presignedGetObject: vi.fn() },
  MINIO_BUCKET: "murcha",
}));

const { createApp } = await import("../../app.js");
const { signAccessToken } = await import("../../lib/jwt.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const token = signAccessToken(auth);

function resetFakeTx() {
  for (const model of Object.values(fakeTx)) {
    if (typeof model !== "object") continue;
    for (const fn of Object.values(model)) {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    }
  }
  putObject.mockReset();
}

describe("GET /api/v1/companies/me", () => {
  beforeEach(() => resetFakeTx());

  it("kompaniya topilmasa 404 qaytaradi", async () => {
    fakeTx.company.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/companies/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("topilsa 200 qaytaradi", async () => {
    fakeTx.company.findUnique.mockResolvedValue({ id: "c1", name: "Murcha" });

    const res = await request(createApp())
      .get("/api/v1/companies/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "c1", name: "Murcha" });
  });
});

describe("PATCH /api/v1/companies/me", () => {
  beforeEach(() => resetFakeTx());

  it("companies.manage ruxsati yo'q bo'lsa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .patch("/api/v1/companies/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ brandColor: "#112233" });

    expect(res.status).toBe(403);
  });

  it("noto'g'ri brandColor formatida 400 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });

    const res = await request(createApp())
      .patch("/api/v1/companies/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ brandColor: "qizil" });

    expect(res.status).toBe(400);
  });

  it("to'g'ri holatda 200 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.company.findUnique.mockResolvedValue({ id: "c1", settings: {} });
    fakeTx.company.update.mockResolvedValue({ id: "c1", brandColor: "#112233" });

    const res = await request(createApp())
      .patch("/api/v1/companies/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ brandColor: "#112233" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "c1", brandColor: "#112233" });
  });
});

describe("POST /api/v1/companies/me/logo", () => {
  beforeEach(() => resetFakeTx());

  it("companies.manage ruxsati yo'q bo'lsa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/companies/me/logo")
      .set("Authorization", `Bearer ${token}`)
      .attach("logo", Buffer.from("fake-png"), { filename: "logo.png", contentType: "image/png" });

    expect(res.status).toBe(403);
  });

  it("fayl berilmasa 400 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });

    const res = await request(createApp())
      .post("/api/v1/companies/me/logo")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("to'g'ri fayl bilan 200 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.company.findUnique.mockResolvedValue({ id: "c1" });
    fakeTx.company.update.mockResolvedValue({ id: "c1", logoPath: "companies/c1/logo.png" });

    const res = await request(createApp())
      .post("/api/v1/companies/me/logo")
      .set("Authorization", `Bearer ${token}`)
      .attach("logo", Buffer.from("fake-png"), { filename: "logo.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(putObject).toHaveBeenCalled();
    expect(res.body).toEqual({ id: "c1", logoPath: "companies/c1/logo.png" });
  });
});
