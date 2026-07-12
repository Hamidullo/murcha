import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  product: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  unit: { findUnique: vi.fn() },
  category: { findUnique: vi.fn() },
  productUnit: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  productBarcode: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  priceType: { findUnique: vi.fn() },
  productPrice: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  productVariant: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  productImage: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const hasPermission = vi.fn().mockResolvedValue(true);
vi.mock("../roles/roles.repository.js", () => ({
  RolesRepository: class {
    hasPermission(...args) {
      return hasPermission(...args);
    }
  },
}));

const putObject = vi.fn();
const removeObject = vi.fn();
const presignedGetObject = vi.fn();
vi.mock("../../lib/minio.js", () => ({
  minioClient: {
    putObject: (...args) => putObject(...args),
    removeObject: (...args) => removeObject(...args),
    presignedGetObject: (...args) => presignedGetObject(...args),
  },
  MINIO_BUCKET: "murcha-test",
}));

const queueAdd = vi.fn();
vi.mock("../../lib/queue.js", () => ({
  thumbnailQueue: { add: (...args) => queueAdd(...args) },
}));

const { createApp } = await import("../../app.js");
const { signAccessToken } = await import("../../lib/jwt.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const token = signAccessToken(auth);
const dto = {
  sku: "SKU-1",
  nameUz: "Non",
  baseUnitId: "00000000-0000-7000-8000-000000000001",
};

describe("POST /api/v1/products", () => {
  beforeEach(() => {
    fakeTx.product.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.product.findFirst.mockReset().mockResolvedValue(null);
    fakeTx.unit.findUnique.mockReset().mockResolvedValue({ id: dto.baseUnitId, short: "dona" });
    fakeTx.category.findUnique.mockReset();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/products").send(dto);

    expect(res.status).toBe(401);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send(dto);

    expect(res.status).toBe(403);
  });

  it("noto'g'ri body (baseUnitId yo'q) 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ sku: "SKU-1", nameUz: "Non" });

    expect(res.status).toBe(400);
  });

  it("SKU band bo'lsa 409 qaytaradi", async () => {
    fakeTx.product.findFirst.mockResolvedValue({ id: "p-existing" });

    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send(dto);

    expect(res.status).toBe(409);
  });

  it("baseUnitId topilmasa 404 qaytaradi", async () => {
    fakeTx.unit.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send(dto);

    expect(res.status).toBe(404);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send(dto);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ companyId: "c1", sku: "SKU-1", nameUz: "Non" });
  });
});

describe("GET /api/v1/products", () => {
  it("ro'yxatni qaytaradi", async () => {
    fakeTx.product.findMany.mockResolvedValue([{ id: "p1", nameUz: "Non" }]);

    const res = await request(createApp())
      .get("/api/v1/products")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([{ id: "p1", nameUz: "Non" }]);
  });

  it("search va categoryId query bilan filtrlaydi", async () => {
    fakeTx.product.findMany.mockReset().mockResolvedValue([]);

    const res = await request(createApp())
      .get("/api/v1/products")
      .query({ search: "non", categoryId: "00000000-0000-7000-8000-000000000005" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(fakeTx.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nameUz: { contains: "non", mode: "insensitive" },
          categoryId: "00000000-0000-7000-8000-000000000005",
        }),
      }),
    );
  });

  it("noto'g'ri categoryId (UUID emas) 400 qaytaradi", async () => {
    const res = await request(createApp())
      .get("/api/v1/products")
      .query({ categoryId: "not-a-uuid" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/products/:id", () => {
  it("topilmasa 404 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/products/p1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/products/:id", () => {
  it("mavjud bo'lsa 204 qaytaradi va status:archived bilan yangilaydi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.product.update.mockResolvedValue({ id: "p1", status: "archived" });

    const res = await request(createApp())
      .delete("/api/v1/products/p1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(fakeTx.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ status: "archived" }),
    });
  });
});

describe("POST /api/v1/products/:id/units", () => {
  beforeEach(() => {
    fakeTx.product.findUnique.mockReset().mockResolvedValue({ id: "p1", baseUnitId: "unit-base" });
    fakeTx.unit.findUnique.mockReset().mockResolvedValue({ id: "unit-blok" });
    fakeTx.productUnit.findUnique.mockReset().mockResolvedValue(null);
    fakeTx.productUnit.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("mahsulot topilmasa 404 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/products/p1/units")
      .set("Authorization", `Bearer ${token}`)
      .send({ unitId: "00000000-0000-7000-8000-000000000002", factor: 20 });

    expect(res.status).toBe(404);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products/p1/units")
      .set("Authorization", `Bearer ${token}`)
      .send({ unitId: "00000000-0000-7000-8000-000000000002", factor: 20 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ productId: "p1", factor: 20 });
  });
});

describe("GET /api/v1/products/:id/units", () => {
  it("ro'yxatni qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productUnit.findMany.mockResolvedValue([{ id: "pu1", factor: 20 }]);

    const res = await request(createApp())
      .get("/api/v1/products/p1/units")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.units).toEqual([{ id: "pu1", factor: 20 }]);
  });
});

describe("DELETE /api/v1/products/:id/units/:unitId", () => {
  it("boshqa mahsulotga tegishli bo'lsa 404 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productUnit.findUnique.mockResolvedValue({ id: "pu1", productId: "p2" });

    const res = await request(createApp())
      .delete("/api/v1/products/p1/units/pu1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("to'g'ri bo'lsa 204 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productUnit.findUnique.mockResolvedValue({ id: "pu1", productId: "p1" });

    const res = await request(createApp())
      .delete("/api/v1/products/p1/units/pu1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(fakeTx.productUnit.delete).toHaveBeenCalledWith({ where: { id: "pu1" } });
  });
});

describe("POST /api/v1/products/:id/barcodes", () => {
  beforeEach(() => {
    fakeTx.product.findUnique.mockReset().mockResolvedValue({ id: "p1" });
    fakeTx.productBarcode.findFirst.mockReset().mockResolvedValue(null);
    fakeTx.productBarcode.create
      .mockReset()
      .mockImplementation((args) => Promise.resolve(args.data));
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("shtrix-kod band bo'lsa 409 qaytaradi", async () => {
    fakeTx.productBarcode.findFirst.mockResolvedValue({ id: "b-existing" });

    const res = await request(createApp())
      .post("/api/v1/products/p1/barcodes")
      .set("Authorization", `Bearer ${token}`)
      .send({ barcode: "4780000000017" });

    expect(res.status).toBe(409);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products/p1/barcodes")
      .set("Authorization", `Bearer ${token}`)
      .send({ barcode: "4780000000017" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ productId: "p1", barcode: "4780000000017" });
  });
});

describe("DELETE /api/v1/products/:id/barcodes/:barcodeId", () => {
  it("to'g'ri bo'lsa 204 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productBarcode.findUnique.mockResolvedValue({ id: "b1", productId: "p1" });

    const res = await request(createApp())
      .delete("/api/v1/products/p1/barcodes/b1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(fakeTx.productBarcode.delete).toHaveBeenCalledWith({ where: { id: "b1" } });
  });
});

describe("POST /api/v1/products/:id/prices", () => {
  beforeEach(() => {
    fakeTx.product.findUnique.mockReset().mockResolvedValue({ id: "p1" });
    fakeTx.priceType.findUnique.mockReset().mockResolvedValue({ id: "pt1" });
    fakeTx.productPrice.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("mahsulot topilmasa 404 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/products/p1/prices")
      .set("Authorization", `Bearer ${token}`)
      .send({ priceTypeId: "00000000-0000-7000-8000-000000000003", price: 1000, currency: "UZS" });

    expect(res.status).toBe(404);
  });

  it("narx turi topilmasa 404 qaytaradi", async () => {
    fakeTx.priceType.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/products/p1/prices")
      .set("Authorization", `Bearer ${token}`)
      .send({ priceTypeId: "00000000-0000-7000-8000-000000000003", price: 1000, currency: "UZS" });

    expect(res.status).toBe(404);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products/p1/prices")
      .set("Authorization", `Bearer ${token}`)
      .send({ priceTypeId: "00000000-0000-7000-8000-000000000003", price: 1000, currency: "UZS" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ productId: "p1", price: 1000, currency: "UZS" });
  });
});

describe("GET /api/v1/products/:id/prices", () => {
  it("to'liq tarixni qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productPrice.findMany.mockResolvedValue([{ id: "pp1", price: 1000 }]);

    const res = await request(createApp())
      .get("/api/v1/products/p1/prices")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.prices).toEqual([{ id: "pp1", price: 1000 }]);
  });
});

describe("GET /api/v1/products/:id/prices/current", () => {
  it("joriy narxlarni qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productPrice.findMany.mockResolvedValue([{ id: "pp1", price: 1000 }]);

    const res = await request(createApp())
      .get("/api/v1/products/p1/prices/current")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.prices).toEqual([{ id: "pp1", price: 1000 }]);
  });
});

describe("POST /api/v1/products/:id/variants", () => {
  beforeEach(() => {
    fakeTx.product.findUnique.mockReset().mockResolvedValue({ id: "p1" });
    fakeTx.productVariant.create
      .mockReset()
      .mockImplementation((args) => Promise.resolve(args.data));
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("mahsulot topilmasa 404 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/products/p1/variants")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Qizil" });

    expect(res.status).toBe(404);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products/p1/variants")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Qizil" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ productId: "p1", name: "Qizil" });
  });
});

describe("GET /api/v1/products/:id/variants", () => {
  it("ro'yxatni qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productVariant.findMany.mockResolvedValue([{ id: "v1", name: "Qizil" }]);

    const res = await request(createApp())
      .get("/api/v1/products/p1/variants")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.variants).toEqual([{ id: "v1", name: "Qizil" }]);
  });
});

describe("GET /api/v1/products/:id/variants/:variantId", () => {
  it("boshqa mahsulotga tegishli bo'lsa 404 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productVariant.findUnique.mockResolvedValue({ id: "v1", productId: "p2" });

    const res = await request(createApp())
      .get("/api/v1/products/p1/variants/v1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/products/:id/variants/:variantId", () => {
  it("to'g'ri bo'lsa yangilaydi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productVariant.findUnique.mockResolvedValue({ id: "v1", productId: "p1" });
    fakeTx.productVariant.update.mockResolvedValue({ id: "v1", name: "Yangi" });

    const res = await request(createApp())
      .patch("/api/v1/products/p1/variants/v1")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Yangi" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "v1", name: "Yangi" });
  });
});

describe("DELETE /api/v1/products/:id/variants/:variantId", () => {
  it("to'g'ri bo'lsa 204 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productVariant.findUnique.mockResolvedValue({ id: "v1", productId: "p1" });
    fakeTx.productVariant.update.mockResolvedValue({ id: "v1" });

    const res = await request(createApp())
      .delete("/api/v1/products/p1/variants/v1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(fakeTx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    });
  });
});

describe("POST /api/v1/products/:id/images", () => {
  beforeEach(() => {
    fakeTx.product.findUnique.mockReset().mockResolvedValue({ id: "p1" });
    fakeTx.productImage.findMany.mockReset().mockResolvedValue([]);
    fakeTx.productImage.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    putObject.mockReset().mockResolvedValue(undefined);
    queueAdd.mockReset().mockResolvedValue(undefined);
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("fayl biriktirilmasa 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products/p1/images")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/products/p1/images")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("fake-image"), {
        filename: "test.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(403);
  });

  it("ruxsatsiz fayl turida 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products/p1/images")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("fake-pdf"), {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(400);
  });

  it("mahsulot topilmasa 404 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/products/p1/images")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("fake-image"), {
        filename: "test.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(404);
  });

  it("to'g'ri fayl bilan 201 qaytaradi va navbatga qo'shadi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products/p1/images")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("fake-image"), {
        filename: "test.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ productId: "p1", isMain: true, sort: 0 });
    expect(putObject).toHaveBeenCalledTimes(1);
    expect(queueAdd).toHaveBeenCalledWith("generate", {
      imageId: expect.any(String),
      path: expect.any(String),
    });
  });
});

describe("GET /api/v1/products/:id/images", () => {
  it("ro'yxatni qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productImage.findMany.mockResolvedValue([{ id: "img1", isMain: true }]);

    const res = await request(createApp())
      .get("/api/v1/products/p1/images")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.images).toEqual([{ id: "img1", isMain: true }]);
  });
});

describe("POST /api/v1/products/:id/images/:imageId/main", () => {
  it("boshqa mahsulotga tegishli bo'lsa 404 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productImage.findUnique.mockResolvedValue({ id: "img1", productId: "p2" });

    const res = await request(createApp())
      .post("/api/v1/products/p1/images/img1/main")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("to'g'ri bo'lsa 200 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productImage.findUnique.mockResolvedValue({ id: "img1", productId: "p1" });
    fakeTx.productImage.updateMany.mockResolvedValue({});
    fakeTx.productImage.update.mockResolvedValue({ id: "img1", isMain: true });

    const res = await request(createApp())
      .post("/api/v1/products/p1/images/img1/main")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "img1", isMain: true });
  });
});

describe("DELETE /api/v1/products/:id/images/:imageId", () => {
  it("to'g'ri bo'lsa 204 qaytaradi va MinIO'dan o'chiradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productImage.findUnique.mockResolvedValue({
      id: "img1",
      productId: "p1",
      path: "products/p1/img1.jpg",
      thumbPath: null,
    });
    fakeTx.productImage.delete.mockResolvedValue({});
    removeObject.mockReset().mockResolvedValue(undefined);

    const res = await request(createApp())
      .delete("/api/v1/products/p1/images/img1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(removeObject).toHaveBeenCalledWith("murcha-test", "products/p1/img1.jpg");
    expect(fakeTx.productImage.delete).toHaveBeenCalledWith({ where: { id: "img1" } });
  });
});

describe("GET /api/v1/products/:id/images/:imageId/url", () => {
  it("to'g'ri bo'lsa imzolangan URL qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.productImage.findUnique.mockResolvedValue({
      id: "img1",
      productId: "p1",
      path: "products/p1/img1.jpg",
    });
    presignedGetObject.mockReset().mockResolvedValue("https://minio.example/signed-url");

    const res = await request(createApp())
      .get("/api/v1/products/p1/images/img1/url")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: "https://minio.example/signed-url" });
  });
});
