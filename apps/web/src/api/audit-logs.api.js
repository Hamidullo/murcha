import { apiFetch } from "./client.js";

/**
 * @param {{ entityType?: string, entityId?: string, userId?: string, from?: string, to?: string }} [filters]
 * @returns {Promise<{ logs: object[] }>}
 */
export function listAuditLogs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId) params.set("entityId", filters.entityId);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return apiFetch(`/audit-logs${query ? `?${query}` : ""}`);
}
