import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const queryRaw = vi.fn();
vi.mock("../lib/prisma.js", () => ({
  prisma: { $queryRaw: (...args) => queryRaw(...args) },
}));

const redisConnect = vi.fn();
const redisPing = vi.fn();
vi.mock("ioredis", () => ({
  default: class {
    on() {}
    connect() {
      return redisConnect();
    }
    ping() {
      return redisPing();
    }
    disconnect() {}
  },
}));

const { createApp } = await import("../app.js");

describe("GET /healthz", () => {
  beforeEach(() => {
    queryRaw.mockReset();
    redisConnect.mockReset();
    redisPing.mockReset();
  });

  it("DB va Redis ishlasa 200 'ok' qaytaradi", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    redisConnect.mockResolvedValue(undefined);
    redisPing.mockResolvedValue("PONG");

    const res = await request(createApp()).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", checks: { db: true, redis: true } });
  });

  it("DB ulanmasa 503 'degraded' qaytaradi", async () => {
    queryRaw.mockRejectedValue(new Error("DB yo'q"));
    redisConnect.mockResolvedValue(undefined);
    redisPing.mockResolvedValue("PONG");

    const res = await request(createApp()).get("/healthz");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "degraded", checks: { db: false, redis: true } });
  });
});
