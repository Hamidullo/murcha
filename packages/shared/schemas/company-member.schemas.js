import { z } from "zod";
import { phoneSchema } from "./auth.schemas.js";

export const employeeAssignmentSchema = z.object({
  targetType: z.enum(["warehouse", "sale_point"]),
  targetId: z.string().uuid(),
});

export const createEmployeeSchema = z.object({
  phone: phoneSchema,
  fullName: z.string().min(2).max(200),
  roleId: z.string().uuid(),
  assignments: z.array(employeeAssignmentSchema).optional(),
});

export const updateEmployeeSchema = z.object({
  roleId: z.string().uuid().optional(),
  status: z.enum(["active", "blocked"]).optional(),
});
