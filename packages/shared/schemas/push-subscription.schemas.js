import { z } from "zod";

export const createPushSubscriptionSchema = z.object({
  endpoint: z.string().url("Noto'g'ri endpoint"),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh kerak"),
    auth: z.string().min(1, "auth kerak"),
  }),
});
