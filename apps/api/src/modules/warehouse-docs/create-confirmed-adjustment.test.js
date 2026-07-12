import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyStockAdjustment } from "./create-confirmed-adjustment.js";

const fakeTx = {};

describe("applyStockAdjustment", () => {
  let repos;

  beforeEach(() => {
    repos = {
      warehouseDocsRepository: {
        nextCounter: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue({ id: "d1" }),
        addItem: vi.fn().mockResolvedValue({ id: "i1" }),
      },
      stockRepository: { applyDelta: vi.fn() },
      stockMovementsRepository: { create: vi.fn() },
    };
  });

  it("delta 0 bo'lsa hech narsa yaratmaydi, null qaytaradi", async () => {
    const result = await applyStockAdjustment(fakeTx, repos, {
      companyId: "c1",
      userId: "u1",
      warehouseId: "w1",
      productId: "p1",
      unitId: "u-dona",
      delta: 0,
    });

    expect(result).toBeNull();
    expect(repos.warehouseDocsRepository.create).not.toHaveBeenCalled();
    expect(repos.stockRepository.applyDelta).not.toHaveBeenCalled();
  });

  it("delta musbat bo'lsa receipt hujjat yaratadi", async () => {
    const doc = await applyStockAdjustment(fakeTx, repos, {
      companyId: "c1",
      userId: "u1",
      warehouseId: "w1",
      productId: "p1",
      unitId: "u-dona",
      delta: 5,
    });

    expect(repos.warehouseDocsRepository.nextCounter).toHaveBeenCalledWith(
      fakeTx,
      "c1",
      "receipt",
      new Date().getFullYear(),
    );
    expect(repos.warehouseDocsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({
        type: "receipt",
        status: "confirmed",
        warehouseId: "w1",
        confirmedBy: "u1",
      }),
    );
    expect(repos.warehouseDocsRepository.addItem).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ docId: "d1", qty: 5, qtyBase: 5 }),
    );
    expect(repos.stockRepository.applyDelta).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ warehouseId: "w1", productId: "p1", qtyDelta: 5 }),
    );
    expect(repos.stockMovementsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ docType: "receipt", docId: "d1", docItemId: "i1", qty: 5 }),
    );
    expect(doc).toEqual({ id: "d1" });
  });

  it("delta manfiy bo'lsa writeoff hujjat yaratadi (abs qty bilan)", async () => {
    await applyStockAdjustment(fakeTx, repos, {
      companyId: "c1",
      userId: "u1",
      warehouseId: "w1",
      productId: "p1",
      unitId: "u-dona",
      delta: -7,
    });

    expect(repos.warehouseDocsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ type: "writeoff" }),
    );
    expect(repos.warehouseDocsRepository.addItem).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ qty: 7, qtyBase: 7 }),
    );
    expect(repos.stockRepository.applyDelta).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ qtyDelta: -7 }),
    );
    expect(repos.stockMovementsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ docType: "writeoff", qty: -7 }),
    );
  });

  it("variantId/batchId berilsa uzatiladi", async () => {
    await applyStockAdjustment(fakeTx, repos, {
      companyId: "c1",
      userId: "u1",
      warehouseId: "w1",
      productId: "p1",
      unitId: "u-dona",
      variantId: "v1",
      batchId: "b1",
      delta: 3,
    });

    expect(repos.warehouseDocsRepository.addItem).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ variantId: "v1", batchId: "b1" }),
    );
    expect(repos.stockRepository.applyDelta).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ variantId: "v1", batchId: "b1" }),
    );
  });
});
