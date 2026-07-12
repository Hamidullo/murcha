import { describe, it, expect, vi, beforeEach } from "vitest";
import { importProductRow, importStockRow, importCounterpartyRow } from "./import-processors.js";

const fakeTx = {};
const companyId = "c1";
const userId = "u1";

describe("importProductRow", () => {
  let repos;

  beforeEach(() => {
    repos = {
      productsRepository: { findBySku: vi.fn(), create: vi.fn(), update: vi.fn() },
      categoriesRepository: { list: vi.fn().mockResolvedValue([]) },
      unitsRepository: {
        list: vi.fn().mockResolvedValue([{ id: "unit1", name: "dona", short: "dona" }]),
      },
    };
  });

  it("SKU yoki nomi bo'lmasa xato otadi", async () => {
    await expect(
      importProductRow(fakeTx, repos, companyId, { sku: "", nameUz: "Non", unitName: "dona" }),
    ).rejects.toThrow("SKU va nomi majburiy");
  });

  it("birlik topilmasa xato otadi", async () => {
    await expect(
      importProductRow(fakeTx, repos, companyId, {
        sku: "SKU-1",
        nameUz: "Non",
        unitName: "noma'lum",
      }),
    ).rejects.toThrow("Birlik topilmadi");
  });

  it("kategoriya nomi topilmasa xato otadi", async () => {
    await expect(
      importProductRow(fakeTx, repos, companyId, {
        sku: "SKU-1",
        nameUz: "Non",
        unitName: "dona",
        categoryName: "Yo'q kategoriya",
      }),
    ).rejects.toThrow("Kategoriya topilmadi");
  });

  it("mavjud SKU bo'lsa yangilaydi", async () => {
    repos.productsRepository.findBySku.mockResolvedValue({ id: "p1", sku: "SKU-1" });

    await importProductRow(fakeTx, repos, companyId, {
      sku: "SKU-1",
      nameUz: "Yangi nom",
      unitName: "DONA",
    });

    expect(repos.productsRepository.update).toHaveBeenCalledWith(
      fakeTx,
      "p1",
      expect.objectContaining({ nameUz: "Yangi nom", baseUnitId: "unit1" }),
    );
    expect(repos.productsRepository.create).not.toHaveBeenCalled();
  });

  it("yangi SKU bo'lsa yaratadi", async () => {
    repos.productsRepository.findBySku.mockResolvedValue(null);

    await importProductRow(fakeTx, repos, companyId, {
      sku: "SKU-2",
      nameUz: "Yog'",
      unitName: "dona",
    });

    expect(repos.productsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ companyId, sku: "SKU-2", nameUz: "Yog'", status: "active" }),
    );
  });
});

describe("importStockRow", () => {
  let repos;

  beforeEach(() => {
    repos = {
      warehousesRepository: {
        list: vi.fn().mockResolvedValue([{ id: "w1", name: "Markaziy sklad" }]),
      },
      productsRepository: {
        findBySku: vi.fn().mockResolvedValue({ id: "p1", baseUnitId: "unit1" }),
      },
      stockRepository: { findOne: vi.fn(), applyDelta: vi.fn() },
      stockMovementsRepository: { create: vi.fn() },
      warehouseDocsRepository: {
        nextCounter: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue({ id: "d1" }),
        addItem: vi.fn().mockResolvedValue({ id: "i1" }),
      },
    };
  });

  it("majburiy maydonlar yo'q bo'lsa xato otadi", async () => {
    await expect(
      importStockRow(fakeTx, repos, companyId, userId, {
        warehouseName: "",
        sku: "",
        quantity: null,
      }),
    ).rejects.toThrow("majburiy");
  });

  it("manfiy miqdorda xato otadi", async () => {
    await expect(
      importStockRow(fakeTx, repos, companyId, userId, {
        warehouseName: "Markaziy sklad",
        sku: "SKU-1",
        quantity: -5,
      }),
    ).rejects.toThrow("manfiy");
  });

  it("sklad topilmasa xato otadi", async () => {
    await expect(
      importStockRow(fakeTx, repos, companyId, userId, {
        warehouseName: "Yo'q sklad",
        sku: "SKU-1",
        quantity: 10,
      }),
    ).rejects.toThrow("Sklad topilmadi");
  });

  it("farq 0 bo'lsa hujjat yaratmaydi", async () => {
    repos.stockRepository.findOne.mockResolvedValue({ quantity: 10 });

    await importStockRow(fakeTx, repos, companyId, userId, {
      warehouseName: "Markaziy sklad",
      sku: "SKU-1",
      quantity: 10,
    });

    expect(repos.warehouseDocsRepository.create).not.toHaveBeenCalled();
    expect(repos.stockRepository.applyDelta).not.toHaveBeenCalled();
  });

  it("farq musbat bo'lsa kirim hujjat yaratadi", async () => {
    repos.stockRepository.findOne.mockResolvedValue({ quantity: 10 });

    await importStockRow(fakeTx, repos, companyId, userId, {
      warehouseName: "Markaziy sklad",
      sku: "SKU-1",
      quantity: 15,
    });

    expect(repos.warehouseDocsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ type: "receipt", status: "confirmed" }),
    );
    expect(repos.stockRepository.applyDelta).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ qtyDelta: 5 }),
    );
  });

  it("farq manfiy bo'lsa spisaniye hujjat yaratadi", async () => {
    repos.stockRepository.findOne.mockResolvedValue({ quantity: 10 });

    await importStockRow(fakeTx, repos, companyId, userId, {
      warehouseName: "Markaziy sklad",
      sku: "SKU-1",
      quantity: 3,
    });

    expect(repos.warehouseDocsRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ type: "writeoff", status: "confirmed" }),
    );
    expect(repos.stockRepository.applyDelta).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ qtyDelta: -7 }),
    );
  });

  it("qoldiq mavjud bo'lmasa (birinchi kirim) 0 deb hisoblaydi", async () => {
    repos.stockRepository.findOne.mockResolvedValue(null);

    await importStockRow(fakeTx, repos, companyId, userId, {
      warehouseName: "Markaziy sklad",
      sku: "SKU-1",
      quantity: 8,
    });

    expect(repos.stockRepository.applyDelta).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ qtyDelta: 8 }),
    );
  });
});

describe("importCounterpartyRow", () => {
  let repos;

  beforeEach(() => {
    repos = {
      counterpartiesRepository: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
  });

  it("turi/nomi yo'q bo'lsa xato otadi", async () => {
    await expect(
      importCounterpartyRow(fakeTx, repos, companyId, { type: "", name: "" }),
    ).rejects.toThrow("majburiy");
  });

  it("noto'g'ri tur bo'lsa xato otadi", async () => {
    await expect(
      importCounterpartyRow(fakeTx, repos, companyId, { type: "boshqa", name: "Aziz" }),
    ).rejects.toThrow("Noto'g'ri tur");
  });

  it("STIR bo'yicha mos yozuv topilsa yangilaydi", async () => {
    repos.counterpartiesRepository.list.mockResolvedValue([{ id: "cp1", tin: "123456789" }]);

    await importCounterpartyRow(fakeTx, repos, companyId, {
      type: "supplier",
      name: "Aziz Trade",
      tin: "123456789",
    });

    expect(repos.counterpartiesRepository.update).toHaveBeenCalledWith(
      fakeTx,
      "cp1",
      expect.objectContaining({ name: "Aziz Trade" }),
    );
    expect(repos.counterpartiesRepository.create).not.toHaveBeenCalled();
  });

  it("STIR berilmasa yoki topilmasa yangi yaratadi", async () => {
    await importCounterpartyRow(fakeTx, repos, companyId, {
      type: "customer",
      name: "Yangi mijoz",
    });

    expect(repos.counterpartiesRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ companyId, type: "customer", name: "Yangi mijoz" }),
    );
  });
});
