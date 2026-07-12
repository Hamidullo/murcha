import { describe, it, expect } from "vitest";
import { renderOrderInvoicePdf, renderWarehouseDocPdf } from "./printing.pdf.js";

const order = {
  number: "ZAK-2026-00001",
  salePoint: { name: "Do'kon 1" },
  confirmedAt: new Date("2026-07-01"),
  currency: "UZS",
  total: 20000,
  items: [
    {
      product: { nameUz: "Non", sku: "SKU-1" },
      unit: { short: "dona" },
      qtyOrdered: 2,
      qtyShipped: 2,
      price: 10000,
      total: 20000,
    },
  ],
};

const warehouseDoc = {
  type: "receipt",
  number: "KIR-2026-00001",
  warehouse: { name: "Markaziy sklad" },
  toWarehouse: null,
  counterparty: { name: "Postavshchik MChJ" },
  confirmedAt: new Date("2026-07-01"),
  currency: "UZS",
  total: 50000,
  reason: null,
  items: [
    {
      product: { nameUz: "Choy", sku: "SKU-2" },
      unit: { short: "quti" },
      qty: 5,
      price: 10000,
      total: 50000,
    },
  ],
};

describe("renderOrderInvoicePdf", () => {
  it("logosiz PDF Buffer generatsiya qiladi", async () => {
    const buffer = await renderOrderInvoicePdf({
      order,
      company: { name: "Chaqqon savdo" },
      logoBase64: null,
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("logo bilan PDF Buffer generatsiya qiladi", async () => {
    const tinyPngBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    const buffer = await renderOrderInvoicePdf({
      order,
      company: { name: "Chaqqon savdo" },
      logoBase64: tinyPngBase64,
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});

describe("renderWarehouseDocPdf", () => {
  it("receipt hujjat uchun PDF Buffer generatsiya qiladi", async () => {
    const buffer = await renderWarehouseDocPdf({
      doc: warehouseDoc,
      company: { name: "Chaqqon savdo" },
      logoBase64: null,
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("writeoff hujjat sababi bilan PDF generatsiya qiladi", async () => {
    const buffer = await renderWarehouseDocPdf({
      doc: { ...warehouseDoc, type: "writeoff", counterparty: null, reason: "Brak" },
      company: null,
      logoBase64: null,
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
