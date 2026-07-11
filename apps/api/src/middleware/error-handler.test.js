import { describe, it, expect, vi } from "vitest";
import { errorHandler } from "./error-handler.js";
import { NotFoundError } from "../lib/errors.js";

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("errorHandler", () => {
  it("AppError'ni statusCode/code bilan JSON qilib qaytaradi", () => {
    const res = mockRes();
    const req = { log: { error: vi.fn() } };
    errorHandler(new NotFoundError("mahsulot topilmadi"), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "not_found", message: "mahsulot topilmadi", details: undefined },
    });
  });

  it("noma'lum xatoni 500 qilib yashiradi va log qiladi", () => {
    const res = mockRes();
    const logError = vi.fn();
    const req = { log: { error: logError } };
    errorHandler(new Error("kutilmagan"), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "internal_error", message: "Server xatosi" },
    });
    expect(logError).toHaveBeenCalled();
  });
});
