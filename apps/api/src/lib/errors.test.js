import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InsufficientStockError,
  TooManyRequestsError,
} from "./errors.js";

describe("AppError ierarxiyasi", () => {
  it("AppError standart statusCode/code beradi", () => {
    const err = new AppError("xato");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("internal_error");
    expect(err).toBeInstanceOf(Error);
  });

  it.each([
    [ValidationError, 400, "validation_error"],
    [UnauthorizedError, 401, "unauthorized"],
    [ForbiddenError, 403, "forbidden"],
    [NotFoundError, 404, "not_found"],
    [ConflictError, 409, "conflict"],
    [InsufficientStockError, 409, "insufficient_stock"],
    [TooManyRequestsError, 429, "too_many_requests"],
  ])("%s to'g'ri statusCode/code o'rnatadi", (ErrorClass, statusCode, code) => {
    const err = new ErrorClass();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(statusCode);
    expect(err.code).toBe(code);
  });

  it("ValidationError details saqlaydi", () => {
    const err = new ValidationError("noto'g'ri", { field: "sku" });
    expect(err.details).toEqual({ field: "sku" });
  });
});
