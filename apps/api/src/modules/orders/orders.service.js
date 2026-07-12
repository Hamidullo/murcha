import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  InsufficientStockError,
  CreditLimitExceededError,
} from "../../lib/errors.js";
import { computeQtyBase } from "../../lib/qty-base.js";
import { domainEvents } from "../../lib/events.js";

/** `cancel()`da rezerv bo'shatiladigan (allaqachon `confirm()` bo'lgan) statuslar. */
const RESERVED_STATUSES = ["confirmed", "picking"];
/** `cancel()` uchun ruxsat etilgan boshlang'ich statuslar (`shipped`gacha — storno). */
const CANCELLABLE_STATUSES = ["new", "confirmed", "picking"];

const VIEW_PERMISSION = "orders.view";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Zakaz yaratish (Task 2) — do'kon
 * operatori uchun `salePointId` alohida yuborilmaydi, `UserAssignment`
 * orqali auth'dan hal qilinadi (sklad tomoni endpoint'lari `orders.view`
 * ruxsati bilan farqlanadi — pastda `#canViewAll`). Tasdiqlash/bekor
 * qilish/yig'ish/jo'natish — Task 3-4'da qo'shiladi.
 */
export class OrdersService {
  /**
   * @param {{
   *   ordersRepository: import("./orders.repository.js").OrdersRepository,
   *   salePointsRepository: import("../sale-points/sale-points.repository.js").SalePointsRepository,
   *   counterpartiesRepository: import("../counterparties/counterparties.repository.js").CounterpartiesRepository,
   *   warehousesRepository: import("../warehouses/warehouses.repository.js").WarehousesRepository,
   *   productsRepository: import("../products/products.repository.js").ProductsRepository,
   *   productUnitsRepository: import("../products/product-units.repository.js").ProductUnitsRepository,
   *   productPricesRepository: import("../products/product-prices.repository.js").ProductPricesRepository,
   *   userAssignmentsRepository: import("../user-assignments/user-assignments.repository.js").UserAssignmentsRepository,
   *   rolesRepository: import("../roles/roles.repository.js").RolesRepository,
   *   stockRepository: import("../stock/stock.repository.js").StockRepository,
   *   stockMovementsRepository: import("../stock/stock-movements.repository.js").StockMovementsRepository,
   *   warehouseDocsRepository: import("../warehouse-docs/warehouse-docs.repository.js").WarehouseDocsRepository,
   *   deliveriesRepository: import("../deliveries/deliveries.repository.js").DeliveriesRepository,
   *   debtMovementsRepository: import("../debts/debts.repository.js").DebtMovementsRepository,
   *   companiesRepository: import("../companies/companies.repository.js").CompaniesRepository,
   * }} deps
   */
  constructor({
    ordersRepository,
    salePointsRepository,
    counterpartiesRepository,
    warehousesRepository,
    productsRepository,
    productUnitsRepository,
    productPricesRepository,
    userAssignmentsRepository,
    rolesRepository,
    stockRepository,
    stockMovementsRepository,
    warehouseDocsRepository,
    deliveriesRepository,
    debtMovementsRepository,
    companiesRepository,
  }) {
    this.ordersRepository = ordersRepository;
    this.salePointsRepository = salePointsRepository;
    this.counterpartiesRepository = counterpartiesRepository;
    this.warehousesRepository = warehousesRepository;
    this.productsRepository = productsRepository;
    this.productUnitsRepository = productUnitsRepository;
    this.productPricesRepository = productPricesRepository;
    this.userAssignmentsRepository = userAssignmentsRepository;
    this.rolesRepository = rolesRepository;
    this.stockRepository = stockRepository;
    this.stockMovementsRepository = stockMovementsRepository;
    this.warehouseDocsRepository = warehouseDocsRepository;
    this.deliveriesRepository = deliveriesRepository;
    this.debtMovementsRepository = debtMovementsRepository;
    this.companiesRepository = companiesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createOrderSchema._type} dto
   * @returns {Promise<import("@prisma/client").Order>}
   */
  async create(auth, dto) {
    let wasCreated = false;
    const order = await withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.ordersRepository.findByIdempotencyKey(
        tx,
        auth.companyId,
        dto.idempotencyKey,
      );
      if (existing) {
        return existing;
      }

      const salePointId = await this.userAssignmentsRepository.findSalePointIdForUser(
        tx,
        auth.companyId,
        auth.userId,
      );
      if (!salePointId) {
        throw new ForbiddenError("Foydalanuvchi hech qanday sotuv nuqtasiga biriktirilmagan");
      }
      const salePoint = await this.salePointsRepository.findById(tx, salePointId);
      if (!salePoint) {
        throw new NotFoundError("Sotuv nuqtasi topilmadi");
      }
      const warehouse = await this.warehousesRepository.findById(tx, dto.warehouseId);
      if (!warehouse) {
        throw new NotFoundError("Sklad topilmadi");
      }
      const counterparty = await this.counterpartiesRepository.findById(
        tx,
        salePoint.counterpartyId,
      );

      let subtotal = 0;
      const itemsData = [];
      for (const line of dto.items) {
        const product = await this.productsRepository.findById(tx, line.productId);
        if (!product || product.deletedAt) {
          throw new NotFoundError(`Mahsulot topilmadi: ${line.productId}`);
        }
        const qtyBase = await computeQtyBase(
          tx,
          this.productUnitsRepository,
          product,
          line.unitId,
          line.qty,
        );
        const currentPrices = await this.productPricesRepository.listCurrentByProduct(
          tx,
          line.productId,
          new Date(),
        );
        const priceRow = currentPrices.find((p) => p.priceTypeId === salePoint.priceTypeId);
        if (!priceRow) {
          throw new NotFoundError(`Narx belgilanmagan: ${product.nameUz}`);
        }
        const price = Number(priceRow.price);
        const total = price * line.qty;
        subtotal += total;
        itemsData.push({
          id: uuidv7(),
          productId: line.productId,
          variantId: line.variantId ?? null,
          unitId: line.unitId,
          qtyOrdered: line.qty,
          qtyBaseOrdered: qtyBase,
          price,
          discountPct: 0,
          total,
        });
      }

      const year = new Date().getFullYear();
      const counter = await this.ordersRepository.nextCounter(tx, auth.companyId, year);
      const number = `ZAK-${year}-${String(counter).padStart(5, "0")}`;

      const order = await this.ordersRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        number,
        salePointId,
        warehouseId: dto.warehouseId,
        status: "new",
        paymentTermDays: counterparty?.paymentTermDays ?? 0,
        currency: "UZS",
        subtotal,
        discount: 0,
        total: subtotal,
        idempotencyKey: dto.idempotencyKey,
        comment: dto.comment ?? null,
        createdBy: auth.userId,
        items: { create: itemsData },
      });

      await this.ordersRepository.addStatusHistory(tx, {
        id: uuidv7(),
        orderId: order.id,
        fromStatus: null,
        toStatus: "new",
        byUser: auth.userId,
        comment: null,
      });

      wasCreated = true;
      return order;
    });

    // Tranzaksiyadan TASHQARIDA emit qilinadi (event handler o'z DB
    // yozuvini qiladi — bitta operatsiya = bitta tranzaksiya qoidasi).
    // Idempotency replay'da (`existing` qaytarilganda) qayta bildirishnoma
    // yuborilmaydi.
    if (wasCreated) {
      domainEvents.emit("order.new", {
        companyId: auth.companyId,
        orderId: order.id,
        orderNumber: order.number,
        salePointId: order.salePointId,
      });
    }

    return order;
  }

  /**
   * `orders.view` ruxsati bo'lsa — butun kompaniya zakazlari (sklad tomoni);
   * bo'lmasa — faqat o'z sotuv nuqtasi zakazlari (do'kon operatori).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ status?: string, salePointId?: string, warehouseId?: string }} [filters]
   * @returns {Promise<import("@prisma/client").Order[]>}
   */
  async list(auth, filters = {}) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const canViewAll = await this.rolesRepository.hasPermission(tx, auth.roleId, VIEW_PERMISSION);
      if (canViewAll) {
        return this.ordersRepository.list(tx, auth.companyId, filters);
      }
      const salePointId = await this.userAssignmentsRepository.findSalePointIdForUser(
        tx,
        auth.companyId,
        auth.userId,
      );
      if (!salePointId) {
        return [];
      }
      return this.ordersRepository.list(tx, auth.companyId, { ...filters, salePointId });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Order>}
   */
  async getById(auth, id) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const order = await this.ordersRepository.findById(tx, id);
      if (!order) {
        throw new NotFoundError("Zakaz topilmadi");
      }
      const canViewAll = await this.rolesRepository.hasPermission(tx, auth.roleId, VIEW_PERMISSION);
      if (canViewAll) {
        return order;
      }
      const salePointId = await this.userAssignmentsRepository.findSalePointIdForUser(
        tx,
        auth.companyId,
        auth.userId,
      );
      if (order.salePointId !== salePointId) {
        throw new NotFoundError("Zakaz topilmadi");
      }
      return order;
    });
  }

  /**
   * Faqat `stock.reserved`ni oshiradi (qoldiqning o'zi tegilmaydi — sklad
   * `ship()`da chiqadi, Task 4). Har item uchun mavjud (`quantity - reserved`)
   * yetarli emas bo'lsa butun tasdiqlash bekor qilinadi (qisman rezerv yo'q).
   * Qulflar deadlock oldini olish uchun productId/variantId bo'yicha
   * leksikografik tartibda olinadi (`warehouse-docs`dagi bilan bir xil naqsh).
   * Kredit limit tekshiruvi (Faza 8): kontragentning joriy qarzi + shu zakaz
   * summasi `creditLimit`dan oshsa bloklanadi — `company.settings.creditLimitMode`
   * `"warn"` bo'lsa yoki chaqiruvchida `debts.manage` ruxsati bo'lsa o'tkazib
   * yuboriladi (PLAN.md: "(sozlanadi)").
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} orderId
   * @returns {Promise<import("@prisma/client").Order>}
   */
  async confirm(auth, orderId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const order = await this.ordersRepository.findById(tx, orderId);
      if (!order) {
        throw new NotFoundError("Zakaz topilmadi");
      }
      if (order.status !== "new") {
        throw new ConflictError("Faqat yangi zakazni tasdiqlash mumkin");
      }

      await this.#assertCreditLimit(tx, auth, order);

      const sortedItems = [...order.items].sort((a, b) =>
        this.#lockKey(a) < this.#lockKey(b) ? -1 : 1,
      );
      for (const item of sortedItems) {
        const current = await this.stockRepository.findOne(tx, {
          warehouseId: order.warehouseId,
          productId: item.productId,
          variantId: item.variantId,
          batchId: null,
        });
        const available = current ? Number(current.quantity) - Number(current.reserved) : 0;
        if (available < Number(item.qtyBaseOrdered)) {
          throw new InsufficientStockError(
            `Skladda yetarli qoldiq yo'q (mahsulot: ${item.productId})`,
          );
        }
        await this.stockRepository.applyReservedDelta(tx, {
          id: uuidv7(),
          companyId: auth.companyId,
          warehouseId: order.warehouseId,
          productId: item.productId,
          variantId: item.variantId,
          batchId: null,
          reservedDelta: Number(item.qtyBaseOrdered),
        });
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (order.paymentTermDays ?? 0));

      const updated = await this.ordersRepository.update(tx, orderId, {
        status: "confirmed",
        confirmedAt: new Date(),
        dueDate,
      });
      await this.ordersRepository.addStatusHistory(tx, {
        id: uuidv7(),
        orderId,
        fromStatus: "new",
        toStatus: "confirmed",
        byUser: auth.userId,
        comment: null,
      });
      return updated;
    });
  }

  /**
   * Storno — faqat `shipped`gacha (`new`/`confirmed`/`picking`). Rezerv
   * bo'lgan bo'lsa (`confirmed`/`picking`) to'liq bo'shatiladi. Hujjat/qator
   * o'zgarmaydi — status tarixiga yangi yozuv qo'shiladi (immutable).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} orderId
   * @returns {Promise<import("@prisma/client").Order>}
   */
  async cancel(auth, orderId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const order = await this.ordersRepository.findById(tx, orderId);
      if (!order) {
        throw new NotFoundError("Zakaz topilmadi");
      }
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new ConflictError("Bu zakazni endi bekor qilib bo'lmaydi");
      }

      if (RESERVED_STATUSES.includes(order.status)) {
        for (const item of order.items) {
          await this.stockRepository.applyReservedDelta(tx, {
            id: uuidv7(),
            companyId: auth.companyId,
            warehouseId: order.warehouseId,
            productId: item.productId,
            variantId: item.variantId,
            batchId: null,
            reservedDelta: -Number(item.qtyBaseOrdered),
          });
        }
      }

      const updated = await this.ordersRepository.update(tx, orderId, { status: "cancelled" });
      await this.ordersRepository.addStatusHistory(tx, {
        id: uuidv7(),
        orderId,
        fromStatus: order.status,
        toStatus: "cancelled",
        byUser: auth.userId,
        comment: null,
      });
      return updated;
    });
  }

  /**
   * Yig'ish boshlanganini belgilaydi — stock'ga tegmaydi, faqat sklad
   * navbatidagi holat belgisi (pick list UI shu status bilan ishlaydi).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} orderId
   * @returns {Promise<import("@prisma/client").Order>}
   */
  async pick(auth, orderId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const order = await this.ordersRepository.findById(tx, orderId);
      if (!order) {
        throw new NotFoundError("Zakaz topilmadi");
      }
      if (order.status !== "confirmed") {
        throw new ConflictError("Faqat tasdiqlangan zakazni yig'ishga o'tkazish mumkin");
      }
      const updated = await this.ordersRepository.update(tx, orderId, { status: "picking" });
      await this.ordersRepository.addStatusHistory(tx, {
        id: uuidv7(),
        orderId,
        fromStatus: "confirmed",
        toStatus: "picking",
        byUser: auth.userId,
        comment: null,
      });
      return updated;
    });
  }

  /**
   * Zakazni jo'natadi: bitta darhol-`confirmed` `warehouse_docs` (`issue`,
   * `counterpartyId` — sotuv nuqtasining kontragenti) yaratadi, har item
   * uchun `stock.quantity`/`stock.reserved`ni kamaytiradi va immutable
   * `stock_movements` yozadi (PO qabul qilish/inventarizatsiya
   * tasdiqlashdagi bilan bir xil repository-DI kompozitsiya — bitta
   * `withTenant` tranzaksiyasi). `dto.items` berilmasa har item to'liq
   * buyurtma miqdorida jo'natiladi; qisman qiymat berilsa qolgani
   * **backorder sifatida hisoblanmaydi** (MVP scope-kesish, PLAN.md 6.3).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} orderId
   * @param {import("@murcha/shared").shipOrderSchema._type} dto
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async ship(auth, orderId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const order = await this.ordersRepository.findById(tx, orderId);
      if (!order) {
        throw new NotFoundError("Zakaz topilmadi");
      }
      if (order.status !== "picking") {
        throw new ConflictError("Faqat yig'ilayotgan zakazni jo'natish mumkin");
      }
      const salePoint = await this.salePointsRepository.findById(tx, order.salePointId);

      const overrideQty = new Map((dto.items ?? []).map((line) => [line.orderItemId, line.qty]));

      const year = new Date().getFullYear();
      const counter = await this.warehouseDocsRepository.nextCounter(
        tx,
        auth.companyId,
        "issue",
        year,
      );
      const number = `CHIQ-${year}-${String(counter).padStart(5, "0")}`;
      const doc = await this.warehouseDocsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        type: "issue",
        number,
        warehouseId: order.warehouseId,
        counterpartyId: salePoint.counterpartyId,
        status: "confirmed",
        currency: order.currency,
        total: 0,
        confirmedAt: new Date(),
        confirmedBy: auth.userId,
        createdBy: auth.userId,
      });

      const sortedItems = [...order.items].sort((a, b) =>
        this.#lockKey(a) < this.#lockKey(b) ? -1 : 1,
      );
      let docTotal = 0;
      for (const item of sortedItems) {
        const qtyOrdered = Number(item.qtyOrdered);
        const shipQty = overrideQty.get(item.id) ?? qtyOrdered;
        if (shipQty > qtyOrdered) {
          throw new ValidationError("Jo'natilayotgan miqdor buyurtmadan ko'p bo'lishi mumkin emas");
        }
        const qtyBaseShip = (Number(item.qtyBaseOrdered) * shipQty) / qtyOrdered;
        const total = Number(item.price) * shipQty;
        docTotal += total;

        const docItem = await this.warehouseDocsRepository.addItem(tx, {
          id: uuidv7(),
          docId: doc.id,
          productId: item.productId,
          variantId: item.variantId,
          batchId: null,
          unitId: item.unitId,
          qty: shipQty,
          qtyBase: qtyBaseShip,
          price: item.price,
          total,
        });

        await this.stockRepository.applyDelta(tx, {
          id: uuidv7(),
          companyId: auth.companyId,
          warehouseId: order.warehouseId,
          productId: item.productId,
          variantId: item.variantId,
          batchId: null,
          qtyDelta: -qtyBaseShip,
        });
        await this.stockRepository.applyReservedDelta(tx, {
          id: uuidv7(),
          companyId: auth.companyId,
          warehouseId: order.warehouseId,
          productId: item.productId,
          variantId: item.variantId,
          batchId: null,
          reservedDelta: -qtyBaseShip,
        });
        await this.stockMovementsRepository.create(tx, {
          id: uuidv7(),
          companyId: auth.companyId,
          warehouseId: order.warehouseId,
          productId: item.productId,
          variantId: item.variantId,
          batchId: null,
          docType: "issue",
          docId: doc.id,
          docItemId: docItem.id,
          qty: -qtyBaseShip,
          costPrice: item.price,
          createdBy: auth.userId,
        });

        await this.ordersRepository.updateItem(tx, item.id, {
          qtyShipped: shipQty,
          qtyBaseShipped: qtyBaseShip,
        });
      }

      await this.warehouseDocsRepository.update(tx, doc.id, { total: docTotal });
      await this.ordersRepository.update(tx, orderId, { status: "shipped" });
      await this.ordersRepository.addStatusHistory(tx, {
        id: uuidv7(),
        orderId,
        fromStatus: "picking",
        toStatus: "shipped",
        byUser: auth.userId,
        comment: null,
      });

      return this.warehouseDocsRepository.findById(tx, doc.id);
    });
  }

  /**
   * Do'kon zakazni qabul qiladi (farqlar akti) — `delivered→accepted`.
   * Kuryer bergan 4 xonali `acceptCode` (`deliveries` moduli,
   * `deliverStop()`da yaratilgan) mos kelishi shart — yetkazish tasdig'i.
   * Har item uchun haqiqatda qabul qilingan miqdor (`qtyAccepted`)
   * yoziladi; `qtyShipped`dan kam bo'lsa farq shu ustunlar orqali ko'rinadi
   * (kam kelgan qism uchun alohida spisaniye hujjati yaratilmaydi — tovar
   * `ship()`da allaqachon skladdan chiqqan). Qabul qilingan qiymat bo'yicha
   * (`price × qtyAccepted`) bitta `debt_movement` (`type:"order"`) yoziladi —
   * shu zakazning nasiyasi shu yerda tug'iladi (Faza 8).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} orderId
   * @param {import("@murcha/shared").acceptOrderSchema._type} dto
   * @returns {Promise<import("@prisma/client").Order>}
   */
  async accept(auth, orderId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const order = await this.ordersRepository.findById(tx, orderId);
      if (!order) {
        throw new NotFoundError("Zakaz topilmadi");
      }
      const canViewAll = await this.rolesRepository.hasPermission(tx, auth.roleId, VIEW_PERMISSION);
      if (!canViewAll) {
        const salePointId = await this.userAssignmentsRepository.findSalePointIdForUser(
          tx,
          auth.companyId,
          auth.userId,
        );
        if (order.salePointId !== salePointId) {
          throw new NotFoundError("Zakaz topilmadi");
        }
      }
      if (order.status !== "delivered") {
        throw new ConflictError("Faqat yetkazilgan zakazni qabul qilish mumkin");
      }

      const stop = await this.deliveriesRepository.findByOrderId(tx, orderId);
      if (!stop || stop.acceptCode !== dto.acceptCode) {
        throw new ValidationError("Qabul qilish kodi noto'g'ri");
      }

      const salePoint = await this.salePointsRepository.findById(tx, order.salePointId);

      const itemsById = new Map(order.items.map((item) => [item.id, item]));
      let debtTotal = 0;
      for (const line of dto.items) {
        const item = itemsById.get(line.orderItemId);
        if (!item) {
          throw new NotFoundError(`Zakaz qatori topilmadi: ${line.orderItemId}`);
        }
        const qtyShipped = Number(item.qtyShipped);
        if (line.qtyAccepted > qtyShipped) {
          throw new ValidationError(
            "Qabul qilingan miqdor jo'natilgandan ko'p bo'lishi mumkin emas",
          );
        }
        const qtyBaseAccepted =
          qtyShipped === 0 ? 0 : (Number(item.qtyBaseShipped) * line.qtyAccepted) / qtyShipped;
        await this.ordersRepository.updateItem(tx, item.id, {
          qtyAccepted: line.qtyAccepted,
          qtyBaseAccepted,
        });
        debtTotal += Number(item.price) * line.qtyAccepted;
      }

      const updated = await this.ordersRepository.update(tx, orderId, { status: "accepted" });
      await this.ordersRepository.addStatusHistory(tx, {
        id: uuidv7(),
        orderId,
        fromStatus: "delivered",
        toStatus: "accepted",
        byUser: auth.userId,
        comment: null,
      });
      await this.debtMovementsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        counterpartyId: salePoint.counterpartyId,
        type: "order",
        orderId: order.id,
        amount: debtTotal,
        currency: order.currency,
        dueDate: order.dueDate,
        createdBy: auth.userId,
      });
      return updated;
    });
  }

  /**
   * Qaytarish (vozvrat) — qabul qilingan zakazdan sotilmagan/muddati
   * o'tayotgan tovar skladga qaytariladi. `ship()`ning teskarisi: `receipt`
   * hujjat yaratiladi, `stock.quantity` oshadi. Order o'zi o'zgarmaydi
   * (tasdiqlangan hujjat immutable — CLAUDE.md) — qaytarish mustaqil
   * hujjat. Qarz `docTotal` summasiga kamayadi — bitta `debt_movement`
   * (`type:"return"`, `amount:-docTotal`, shu `receipt` hujjatga bog'langan).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} orderId
   * @param {import("@murcha/shared").returnOrderSchema._type} dto
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async returnItems(auth, orderId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const order = await this.ordersRepository.findById(tx, orderId);
      if (!order) {
        throw new NotFoundError("Zakaz topilmadi");
      }
      const canViewAll = await this.rolesRepository.hasPermission(tx, auth.roleId, VIEW_PERMISSION);
      if (!canViewAll) {
        const salePointId = await this.userAssignmentsRepository.findSalePointIdForUser(
          tx,
          auth.companyId,
          auth.userId,
        );
        if (order.salePointId !== salePointId) {
          throw new NotFoundError("Zakaz topilmadi");
        }
      }
      if (order.status !== "accepted") {
        throw new ConflictError("Faqat qabul qilingan zakazdan qaytarish mumkin");
      }

      const salePoint = await this.salePointsRepository.findById(tx, order.salePointId);

      const itemsById = new Map(order.items.map((item) => [item.id, item]));
      const lines = dto.items.map((line) => {
        const item = itemsById.get(line.orderItemId);
        if (!item) {
          throw new NotFoundError(`Zakaz qatori topilmadi: ${line.orderItemId}`);
        }
        const qtyAccepted = Number(item.qtyAccepted);
        if (line.qty > qtyAccepted) {
          throw new ValidationError(
            "Qaytarilayotgan miqdor qabul qilingandan ko'p bo'lishi mumkin emas",
          );
        }
        return { line, item };
      });
      lines.sort((a, b) => (this.#lockKey(a.item) < this.#lockKey(b.item) ? -1 : 1));

      const year = new Date().getFullYear();
      const counter = await this.warehouseDocsRepository.nextCounter(
        tx,
        auth.companyId,
        "receipt",
        year,
      );
      const number = `KIR-${year}-${String(counter).padStart(5, "0")}`;
      const doc = await this.warehouseDocsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        type: "receipt",
        number,
        warehouseId: order.warehouseId,
        counterpartyId: salePoint.counterpartyId,
        status: "confirmed",
        currency: order.currency,
        reason: `Qaytarish: zakaz № ${order.number}`,
        total: 0,
        confirmedAt: new Date(),
        confirmedBy: auth.userId,
        createdBy: auth.userId,
      });

      let docTotal = 0;
      for (const { line, item } of lines) {
        const qtyBase = (Number(item.qtyBaseAccepted) * line.qty) / Number(item.qtyAccepted);
        const total = Number(item.price) * line.qty;
        docTotal += total;

        const docItem = await this.warehouseDocsRepository.addItem(tx, {
          id: uuidv7(),
          docId: doc.id,
          productId: item.productId,
          variantId: item.variantId,
          batchId: null,
          unitId: item.unitId,
          qty: line.qty,
          qtyBase,
          price: item.price,
          total,
        });

        await this.stockRepository.applyDelta(tx, {
          id: uuidv7(),
          companyId: auth.companyId,
          warehouseId: order.warehouseId,
          productId: item.productId,
          variantId: item.variantId,
          batchId: null,
          qtyDelta: qtyBase,
        });
        await this.stockMovementsRepository.create(tx, {
          id: uuidv7(),
          companyId: auth.companyId,
          warehouseId: order.warehouseId,
          productId: item.productId,
          variantId: item.variantId,
          batchId: null,
          docType: "receipt",
          docId: doc.id,
          docItemId: docItem.id,
          qty: qtyBase,
          costPrice: item.price,
          createdBy: auth.userId,
        });
      }

      await this.warehouseDocsRepository.update(tx, doc.id, { total: docTotal });
      await this.debtMovementsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        counterpartyId: salePoint.counterpartyId,
        type: "return",
        orderId: order.id,
        docId: doc.id,
        amount: -docTotal,
        currency: order.currency,
        createdBy: auth.userId,
      });
      return this.warehouseDocsRepository.findById(tx, doc.id);
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@prisma/client").Order} order
   * @returns {Promise<void>}
   */
  async #assertCreditLimit(tx, auth, order) {
    const salePoint = await this.salePointsRepository.findById(tx, order.salePointId);
    const counterparty = await this.counterpartiesRepository.findById(tx, salePoint.counterpartyId);
    if (counterparty?.creditLimit == null) return;

    const company = await this.companiesRepository.findById(tx, auth.companyId);
    const mode = company?.settings?.creditLimitMode ?? "block";
    if (mode !== "block") return;

    const canOverride = await this.rolesRepository.hasPermission(tx, auth.roleId, "debts.manage");
    if (canOverride) return;

    const currentBalance = await this.debtMovementsRepository.getBalance(
      tx,
      auth.companyId,
      salePoint.counterpartyId,
      order.currency,
    );
    if (currentBalance + Number(order.total) > Number(counterparty.creditLimit)) {
      throw new CreditLimitExceededError(
        `Kredit limiti oshadi: joriy qarz ${currentBalance} + zakaz ${order.total} > limit ${counterparty.creditLimit}`,
      );
    }
  }

  /**
   * @param {{ productId: string, variantId: string | null }} item
   * @returns {string}
   */
  #lockKey(item) {
    return `${item.productId}|${item.variantId ?? ""}`;
  }
}
