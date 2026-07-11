import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionsRepository } from "./sessions.repository.js";

function makeFakeRedis() {
  const multiChain = {
    set: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };
  return {
    multi: vi.fn(() => multiChain),
    get: vi.fn(),
    del: vi.fn(),
    srem: vi.fn(),
    smembers: vi.fn(),
    _multiChain: multiChain,
  };
}

describe("SessionsRepository", () => {
  let redis;
  let repo;

  beforeEach(() => {
    redis = makeFakeRedis();
    repo = new SessionsRepository(redis);
  });

  it("create — session+refresh kalitlarini yozadi, user_sessions setiga qo'shadi", async () => {
    await repo.create("s1", {
      userId: "u1",
      companyId: "c1",
      roleId: "r1",
      refreshToken: "rt1",
      userAgent: "curl",
      ip: "127.0.0.1",
    });

    expect(redis.multi).toHaveBeenCalledTimes(1);
    expect(redis._multiChain.set).toHaveBeenCalledWith(
      "session:s1",
      expect.stringContaining('"userId":"u1"'),
      "EX",
      expect.any(Number),
    );
    expect(redis._multiChain.set).toHaveBeenCalledWith(
      "refresh:s1",
      "rt1",
      "EX",
      expect.any(Number),
    );
    expect(redis._multiChain.sadd).toHaveBeenCalledWith("user_sessions:u1", "s1");
    expect(redis._multiChain.exec).toHaveBeenCalledTimes(1);
  });

  it("getSession — JSON'ni parse qilib qaytaradi", async () => {
    redis.get.mockResolvedValue(JSON.stringify({ userId: "u1", companyId: "c1", roleId: "r1" }));

    const result = await repo.getSession("s1");

    expect(redis.get).toHaveBeenCalledWith("session:s1");
    expect(result).toEqual({ userId: "u1", companyId: "c1", roleId: "r1" });
  });

  it("getSession — topilmasa null qaytaradi", async () => {
    redis.get.mockResolvedValue(null);

    await expect(repo.getSession("s1")).resolves.toBeNull();
  });

  it("getRefreshToken — refresh:{id} kalitini o'qiydi", async () => {
    redis.get.mockResolvedValue("rt1");

    const result = await repo.getRefreshToken("s1");

    expect(redis.get).toHaveBeenCalledWith("refresh:s1");
    expect(result).toBe("rt1");
  });

  it("rotateRefreshToken — refresh kalitini yangilaydi, session TTL'ni uzaytiradi", async () => {
    await repo.rotateRefreshToken("s1", "rt2");

    expect(redis._multiChain.set).toHaveBeenCalledWith(
      "refresh:s1",
      "rt2",
      "EX",
      expect.any(Number),
    );
    expect(redis._multiChain.expire).toHaveBeenCalledWith("session:s1", expect.any(Number));
  });

  it("revoke — session/refresh kalitlarini o'chiradi, user_sessions'dan olib tashlaydi", async () => {
    await repo.revoke("s1", "u1");

    expect(redis.del).toHaveBeenCalledWith("session:s1", "refresh:s1");
    expect(redis.srem).toHaveBeenCalledWith("user_sessions:u1", "s1");
  });

  it("revoke — userId berilmasa srem chaqirmaydi", async () => {
    await repo.revoke("s1");

    expect(redis.srem).not.toHaveBeenCalled();
  });

  it("listByUser — user_sessions a'zolarini session ma'lumoti bilan qaytaradi, bo'shlarini tashlaydi", async () => {
    redis.smembers.mockResolvedValue(["s1", "s2"]);
    redis.get
      .mockResolvedValueOnce(JSON.stringify({ userId: "u1", createdAt: "t1" }))
      .mockResolvedValueOnce(null);

    const result = await repo.listByUser("u1");

    expect(redis.smembers).toHaveBeenCalledWith("user_sessions:u1");
    expect(result).toEqual([{ id: "s1", userId: "u1", createdAt: "t1" }]);
  });
});
