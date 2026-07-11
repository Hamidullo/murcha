import { describe, it, expect, vi } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../lib/tenant-context.js", () => ({ withTenant }));

const hasPermission = vi.fn();
vi.mock("../modules/roles/roles.repository.js", () => ({
  RolesRepository: class {
    hasPermission(...args) {
      return hasPermission(...args);
    }
  },
}));

const { requirePermission } = await import("./require-permission.js");
const { ForbiddenError } = await import("../lib/errors.js");

describe("requirePermission", () => {
  it("ruxsat bo'lsa next()ni xatosiz chaqiradi", async () => {
    hasPermission.mockResolvedValue(true);
    const req = { auth: { userId: "u1", companyId: "c1", roleId: "r1" } };
    const next = vi.fn();

    await requirePermission("orders.confirm")(req, {}, next);

    expect(withTenant).toHaveBeenCalledWith("c1", "u1", expect.any(Function));
    expect(hasPermission).toHaveBeenCalledWith(fakeTx, "r1", "orders.confirm");
    expect(next).toHaveBeenCalledWith();
  });

  it("ruxsat bo'lmasa ForbiddenError bilan next() chaqiradi", async () => {
    hasPermission.mockResolvedValue(false);
    const req = { auth: { userId: "u1", companyId: "c1", roleId: "r1" } };
    const next = vi.fn();

    await requirePermission("orders.confirm")(req, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it("repository xato otsa next(err) chaqiradi", async () => {
    const err = new Error("db down");
    hasPermission.mockRejectedValue(err);
    const req = { auth: { userId: "u1", companyId: "c1", roleId: "r1" } };
    const next = vi.fn();

    await requirePermission("orders.confirm")(req, {}, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
