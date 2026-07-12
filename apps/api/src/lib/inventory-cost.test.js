import { describe, it, expect } from "vitest";
import { computeAverageCost } from "./inventory-cost.js";

describe("computeAverageCost", () => {
  it("og'irlashtirilgan o'rtachani hisoblaydi", () => {
    const result = computeAverageCost([
      { qty: 10, costPrice: 100 },
      { qty: 20, costPrice: 115 },
    ]);

    expect(result).toBe(110);
  });

  it("harakat bo'lmasa null qaytaradi", () => {
    expect(computeAverageCost([])).toBeNull();
  });
});
