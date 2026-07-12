import { describe, it, expect, vi, beforeEach } from "vitest";

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

const { ImportsService } = await import("./imports.service.js");
const { ValidationError, NotFoundError } = await import("../../lib/errors.js");

describe("ImportsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  const file = { buffer: Buffer.from("fake-xlsx"), size: 9, mimetype: "application/xlsx" };
  let service;

  beforeEach(() => {
    putObject.mockReset().mockResolvedValue(undefined);
    queueAdd.mockReset();
    queueGetJob.mockReset();
    service = new ImportsService();
  });

  describe("enqueue", () => {
    it("noto'g'ri turda ValidationError otadi", async () => {
      await expect(service.enqueue(auth, "unknown", file)).rejects.toBeInstanceOf(ValidationError);
      expect(putObject).not.toHaveBeenCalled();
    });

    it("to'g'ri bo'lsa MinIO'ga yozadi va job navbatga qo'yadi", async () => {
      queueAdd.mockResolvedValue({ id: "job1" });

      const result = await service.enqueue(auth, "products", file);

      expect(putObject).toHaveBeenCalledWith(
        "murcha-test",
        expect.stringMatching(/^imports\/c1\/.+\.xlsx$/),
        file.buffer,
        file.size,
        { "Content-Type": file.mimetype },
      );
      expect(queueAdd).toHaveBeenCalledWith(
        "import",
        expect.objectContaining({ type: "products", companyId: "c1", userId: "u1" }),
      );
      expect(result).toEqual({ jobId: "job1" });
    });
  });

  describe("getStatus", () => {
    it("job topilmasa NotFoundError otadi", async () => {
      queueGetJob.mockResolvedValue(null);

      await expect(service.getStatus(auth, "job1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("boshqa kompaniyaga tegishli bo'lsa NotFoundError otadi", async () => {
      queueGetJob.mockResolvedValue({ data: { companyId: "c2" } });

      await expect(service.getStatus(auth, "job1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("to'g'ri bo'lsa holatni qaytaradi", async () => {
      queueGetJob.mockResolvedValue({
        id: "job1",
        data: { companyId: "c1" },
        getState: vi.fn().mockResolvedValue("completed"),
        returnvalue: { total: 5, succeeded: 5, failed: 0, errors: [] },
        failedReason: null,
      });

      const result = await service.getStatus(auth, "job1");

      expect(result).toEqual({
        id: "job1",
        state: "completed",
        result: { total: 5, succeeded: 5, failed: 0, errors: [] },
        failedReason: null,
      });
    });
  });
});
