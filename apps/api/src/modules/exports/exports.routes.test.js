import { describe, it, expect, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  product: { findMany: vi.fn().mockResolvedValue([]) },
  stock: { findMany: vi.fn().mockResolvedValue([]) },
  counterparty: { findMany: vi.fn().mockResolvedValue([]) },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const { createApp } = await import("../../app.js");
const { signAccessToken } = await import("../../lib/jwt.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const token = signAccessToken(auth);

describe("GET /api/v1/exports/products", () => {
  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).get("/api/v1/exports/products");

    expect(res.status).toBe(401);
  });

  it("to'g'ri bo'lsa .xlsx qaytaradi", async () => {
    const res = await request(createApp())
      .get("/api/v1/exports/products")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml.sheet");
    expect(res.headers["content-disposition"]).toContain("mahsulotlar.xlsx");
  });
});

describe("GET /api/v1/exports/stock", () => {
  it("to'g'ri bo'lsa .xlsx qaytaradi", async () => {
    const res = await request(createApp())
      .get("/api/v1/exports/stock")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("qoldiq.xlsx");
  });
});

describe("GET /api/v1/exports/counterparties", () => {
  it("to'g'ri bo'lsa .xlsx qaytaradi", async () => {
    const res = await request(createApp())
      .get("/api/v1/exports/counterparties")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("kontragentlar.xlsx");
  });
});
