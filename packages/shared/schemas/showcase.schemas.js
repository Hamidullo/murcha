import { z } from "zod";
import { phoneSchema } from "./auth.schemas.js";

export const createLeadSchema = z.object({
  name: z.string().min(2).max(200),
  phone: phoneSchema,
  message: z.string().max(2000).optional(),
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().positive() })).optional(),
});
