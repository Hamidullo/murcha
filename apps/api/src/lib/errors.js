/** Barcha kutilgan xatolar shu klassdan meros oladi — error-handler shu orqali taniydi. */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} code
   */
  constructor(message, statusCode = 500, code = "internal_error") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  /**
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(message, details) {
    super(message, 400, "validation_error");
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Avtorizatsiyadan o'tilmagan") {
    super(message, 401, "unauthorized");
  }
}

export class ForbiddenError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Ruxsat yo'q") {
    super(message, 403, "forbidden");
  }
}

export class NotFoundError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Topilmadi") {
    super(message, 404, "not_found");
  }
}

export class ConflictError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Ziddiyat") {
    super(message, 409, "conflict");
  }
}

export class InsufficientStockError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Skladda yetarli qoldiq yo'q") {
    super(message, 409, "insufficient_stock");
  }
}
