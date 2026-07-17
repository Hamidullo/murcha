-- =========================================================================
-- DIQQAT — BU FAYL QO'LLANMAYDI (Faza 13, /code-review topilmasi).
--
-- Mazmuni `migrations/20260717090000_init/migration.sql` oxiriga NUSXALANGAN
-- va HAQIQATDA O'SHA NUSXA bajariladi. Bu fayl faqat tarixiy hujjat —
-- birinchi migratsiya qanday yig'ilganini ko'rsatadi.
--
-- Shu faylni tahrirlash HECH NARSAGA TA'SIR QILMAYDI (jim no-op).
-- Yangi qoida kerak bo'lsa — YANGI migratsiya fayli yozing.
-- (`rls.sql`/`search.sql` esa boshqacha: ular har deploy'da qo'llanadi.)
-- =========================================================================

-- MURCHA — CHECK cheklovlari. Prisma schema.prisma'da native CHECK sintaksisi
-- yo'q, shuning uchun bu SQL birinchi migratsiya generatsiya qilingach
-- (`prisma migrate dev --create-only`) migration.sql fayliga qo'lda qo'shiladi,
-- so'ng migratsiya qo'llaniladi. DATABASE.md'dagi CHECK'lar ro'yxati:

-- stock: manfiy qoldiq/rezerv taqiqlangan, rezerv qoldiqdan oshmaydi
ALTER TABLE stock ADD CONSTRAINT stock_quantity_check
  CHECK (quantity >= 0 AND reserved >= 0 AND reserved <= quantity);

-- Enum o'rniga text ustunlar uchun CHECK (DATABASE.md 10-bo'lim qarori:
-- "Enum'lar: Prisma enum emas, text + CHECK — o'zgartirish oson bo'lsin").
-- Har status/type maydoni uchun ruxsat etilgan qiymatlar shu yerda qotiriladi;
-- yangi qiymat kerak bo'lsa — faqat shu faylni o'zgartirish yetarli.

ALTER TABLE company_members ADD CONSTRAINT company_members_status_check
  CHECK (status IN ('active', 'blocked'));

ALTER TABLE counterparties ADD CONSTRAINT counterparties_type_check
  CHECK (type IN ('supplier', 'customer', 'both'));

ALTER TABLE products ADD CONSTRAINT products_status_check
  CHECK (status IN ('active', 'archived'));

ALTER TABLE warehouse_docs ADD CONSTRAINT warehouse_docs_type_check
  CHECK (type IN ('receipt', 'issue', 'writeoff', 'transfer'));
ALTER TABLE warehouse_docs ADD CONSTRAINT warehouse_docs_status_check
  CHECK (status IN ('draft', 'confirmed', 'cancelled'));

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled'));

ALTER TABLE inventory_counts ADD CONSTRAINT inventory_counts_status_check
  CHECK (status IN ('in_progress', 'review', 'approved'));

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('new', 'confirmed', 'picking', 'shipped', 'delivered', 'accepted', 'cancelled'));

ALTER TABLE deliveries ADD CONSTRAINT deliveries_status_check
  CHECK (status IN ('assigned', 'on_route', 'done'));

ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'converted'));

ALTER TABLE cash_registers ADD CONSTRAINT cash_registers_type_check
  CHECK (type IN ('cash', 'bank', 'card'));

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'transfer_out', 'transfer_in'));

ALTER TABLE debt_movements ADD CONSTRAINT debt_movements_type_check
  CHECK (type IN ('order', 'payment', 'return', 'adjustment', 'opening'));

ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('cash', 'bank', 'card'));

ALTER TABLE notifications ADD CONSTRAINT notifications_channel_check
  CHECK (channel IN ('inapp', 'push', 'sms'));

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'start', 'business', 'corporate'));
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'expired', 'trial'));

ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'blocked'));
