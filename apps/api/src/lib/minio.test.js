import { describe, it, expect, vi, beforeEach } from "vitest";

const bucketExists = vi.fn();
const makeBucket = vi.fn().mockResolvedValue(undefined);
vi.mock("minio", () => ({
  Client: class {
    bucketExists(...args) {
      return bucketExists(...args);
    }
    makeBucket(...args) {
      return makeBucket(...args);
    }
  },
}));

const { ensureBucket } = await import("./minio.js");

describe("ensureBucket", () => {
  beforeEach(() => {
    bucketExists.mockReset();
    makeBucket.mockReset().mockResolvedValue(undefined);
  });

  it("bucket mavjud bo'lsa makeBucket chaqirilmaydi", async () => {
    bucketExists.mockResolvedValue(true);

    await ensureBucket();

    expect(makeBucket).not.toHaveBeenCalled();
  });

  it("bucket mavjud bo'lmasa yaratadi", async () => {
    bucketExists.mockResolvedValue(false);

    await ensureBucket();

    expect(makeBucket).toHaveBeenCalledTimes(1);
  });

  it("xato bo'lsa otmaydi (log qilib davom etadi)", async () => {
    bucketExists.mockRejectedValue(new Error("MinIO ulanmadi"));

    await expect(ensureBucket()).resolves.toBeUndefined();
  });
});
