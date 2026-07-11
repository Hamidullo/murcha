import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validate } from "./validate.js";
import { ValidationError } from "../lib/errors.js";

describe("validate", () => {
  const schema = z.object({ phone: z.string().min(3) });

  it("to'g'ri body'ni parse qilib req.body'ga yozadi, next()ni xatosiz chaqiradi", () => {
    const req = { body: { phone: "+998901234567" } };
    const next = vi.fn();

    validate(schema)(req, {}, next);

    expect(req.body).toEqual({ phone: "+998901234567" });
    expect(next).toHaveBeenCalledWith();
  });

  it("noto'g'ri body'da ValidationError bilan next()ni chaqiradi", () => {
    const req = { body: { phone: "x" } };
    const next = vi.fn();

    validate(schema)(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
  });
});
