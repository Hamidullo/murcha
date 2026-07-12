import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2).max(100),
});

export const updateRoleSchema = createRoleSchema.partial();

export const setRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});
