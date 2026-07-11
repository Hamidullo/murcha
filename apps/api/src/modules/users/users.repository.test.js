import { describe, it, expect, vi } from "vitest";
import { UsersRepository } from "./users.repository.js";

describe("UsersRepository", () => {
  it("findByPhone — tx.user.findUnique'ni phone bilan chaqiradi", async () => {
    const user = { id: "u1", phone: "+998901234567" };
    const tx = { user: { findUnique: vi.fn().mockResolvedValue(user) } };
    const repo = new UsersRepository();

    const result = await repo.findByPhone(tx, "+998901234567");

    expect(tx.user.findUnique).toHaveBeenCalledWith({ where: { phone: "+998901234567" } });
    expect(result).toBe(user);
  });

  it("findById — tx.user.findUnique'ni id bilan chaqiradi", async () => {
    const user = { id: "u1", phone: "+998901234567" };
    const tx = { user: { findUnique: vi.fn().mockResolvedValue(user) } };
    const repo = new UsersRepository();

    const result = await repo.findById(tx, "u1");

    expect(tx.user.findUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(result).toBe(user);
  });

  it("create — tx.user.create'ni data bilan chaqiradi", async () => {
    const data = { id: "u1", phone: "+998901234567", passwordHash: "hash", fullName: "Test" };
    const tx = { user: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new UsersRepository();

    const result = await repo.create(tx, data);

    expect(tx.user.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });
});
