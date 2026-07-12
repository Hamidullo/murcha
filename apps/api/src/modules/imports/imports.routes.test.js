import { describe, it, expect, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = { $executeRaw: vi.fn().mockResolvedValue(undefined) };
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const hasPermission = vi.fn().mockResolvedValue(true);
vi.mock("../roles/roles.repository.js", () => ({
  RolesRepository: class {
    hasPermission(...args) {
      return hasPermission(...args);
    }
  },
}));

const putObject = vi.fn();
vi.mock("../../lib/minio.js", () => ({
  minioClient: { putObject: (...args) => putObject(...args) },
  MINIO_BUCKET: "murcha-test",
}));

const queueAdd = vi.fn();
const queueGetJob = vi.fn();
vi.mock("../../lib/queue.js", () => ({
  importQueue: { add: (...args) => queueAdd(...args), getJob: (...args) => queueGetJob(...args) },
}));

const { createApp } = await import("../../app.js");
const { signAccessToken } = await import("../../lib/jwt.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const token = signAccessToken(auth);

describe("POST /api/v1/imports/:type", () => {
  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/imports/products");

    expect(res.status).toBe(401);
  });

  it("fayl biriktirilmasa 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/imports/products")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("to'g'ri fayl bilan 202 va jobId qaytaradi", async () => {
    putObject.mockResolvedValue(undefined);
    queueAdd.mockResolvedValue({ id: "job1" });

    const res = await request(createApp())
      .post("/api/v1/imports/products")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("fake-xlsx-content"), {
        filename: "mahsulotlar.xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ jobId: "job1" });
  });
});

describe("GET /api/v1/imports/:jobId", () => {
  it("job topilmasa 404 qaytaradi", async () => {
    queueGetJob.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/imports/job1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("topsa holatni qaytaradi", async () => {
    queueGetJob.mockResolvedValue({
      id: "job1",
      data: { companyId: "c1" },
      getState: vi.fn().mockResolvedValue("completed"),
      returnvalue: { total: 2, succeeded: 2, failed: 0, errors: [] },
      failedReason: null,
    });

    const res = await request(createApp())
      .get("/api/v1/imports/job1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ state: "completed" });
  });
});
