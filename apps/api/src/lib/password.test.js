import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashPassword natijasini verifyPassword to'g'ri tekshiradi", async () => {
    const hash = await hashPassword("Murcha2026!");

    expect(hash).not.toBe("Murcha2026!");
    await expect(verifyPassword(hash, "Murcha2026!")).resolves.toBe(true);
  });

  it("noto'g'ri parolni rad etadi", async () => {
    const hash = await hashPassword("Murcha2026!");

    await expect(verifyPassword(hash, "boshqa-parol")).resolves.toBe(false);
  });
});
