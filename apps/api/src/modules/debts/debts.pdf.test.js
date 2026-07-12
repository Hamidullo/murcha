import { describe, it, expect } from "vitest";
import { renderDebtStatementPdf } from "./debts.pdf.js";

describe("renderDebtStatementPdf", () => {
  it("statement ma'lumotlaridan PDF Buffer generatsiya qiladi", async () => {
    const buffer = await renderDebtStatementPdf({
      companyName: "Chaqqon savdo",
      counterpartyName: "Do'kon 1",
      currency: "UZS",
      openingBalance: 1000,
      closingBalance: 1300,
      from: "2026-01-01",
      to: "2026-07-12",
      movements: [
        {
          createdAt: new Date("2026-01-05"),
          type: "order",
          orderNumber: "1",
          amount: 500,
          balance: 1500,
        },
        {
          createdAt: new Date("2026-01-10"),
          type: "payment",
          orderNumber: "1",
          amount: -200,
          balance: 1300,
        },
      ],
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
