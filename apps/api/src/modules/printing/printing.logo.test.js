import { describe, it, expect, vi, beforeEach } from "vitest";

const getObject = vi.fn();
vi.mock("../../lib/minio.js", () => ({
  minioClient: { getObject: (...args) => getObject(...args) },
  MINIO_BUCKET: "murcha",
}));

const { loadCompanyLogoBase64 } = await import("./printing.logo.js");

describe("loadCompanyLogoBase64", () => {
  beforeEach(() => {
    getObject.mockReset();
  });

  it("company null bo'lsa null qaytaradi", async () => {
    const result = await loadCompanyLogoBase64(null);
    expect(result).toBeNull();
    expect(getObject).not.toHaveBeenCalled();
  });

  it("logoPath yo'q bo'lsa null qaytaradi", async () => {
    const result = await loadCompanyLogoBase64({ logoPath: null });
    expect(result).toBeNull();
  });

  async function* fakeStream(chunks) {
    for (const chunk of chunks) yield chunk;
  }

  it("logoPath bo'lsa base64 data URI qaytaradi", async () => {
    getObject.mockResolvedValue(fakeStream([Buffer.from("abc")]));

    const result = await loadCompanyLogoBase64({ logoPath: "companies/c1/logo.png" });

    expect(getObject).toHaveBeenCalledWith("murcha", "companies/c1/logo.png");
    expect(result).toBe(`data:image/png;base64,${Buffer.from("abc").toString("base64")}`);
  });

  it("MinIO xato bersa null qaytaradi (xatosiz davom etadi)", async () => {
    getObject.mockRejectedValue(new Error("network"));

    const result = await loadCompanyLogoBase64({ logoPath: "companies/c1/logo.png" });

    expect(result).toBeNull();
  });
});
