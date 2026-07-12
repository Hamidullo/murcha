# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 7 — Dostavka va kuryer xaritada

`Delivery`/`DeliveryOrder`/`CourierLocation` Prisma modellari Faza 0'dan tayyor (yangi migratsiya kerak emas). `Order.status` enum'i va frontend `STATUS_LABELS` allaqachon `shipped`/`delivered`/`accepted` holatlarini kutadi. Arxitektura qarorlari (acceptCode bilan yetkazish tasdig'i, farqlar akti qtyAccepted ustunlariga, vozvrat alohida `receipt` hujjat, GPS retention tenant-ichi tozalash bilan cron'siz) — Task 1 boshida plan-rejimda kelishilgan.

- [x] **Task 1 — Deliveries backend — biriktirish + bekat**: `deliveries` moduli (create/list/getById, `POST /:id/orders/:orderId/deliver` — acceptCode, egalik tekshiruvi, avtomatik `done`), `deliveries.manage` ruxsati
- [x] **Task 2 — Qabul qilish + qaytarish (orders moduliga qo'shimcha)**: `accept()` (farqlar akti, acceptCode), `returnItems()` (vozvrat — receipt hujjat + stock ↑)
- [x] **Task 3 — Kuryer GPS — Socket.IO + retention**: `courier-locations` moduli, `courier:location`→`courier:position`, tenant-ichi 30-kunlik tozalash
- [x] **Task 4 — Frontend: dispetcher dostavka boshqaruvi (`apps/web`)**: ro'yxat/forma, `deliveries.api.js`, nav
- [x] **Task 5 — Frontend: jonli xarita (`apps/web`)**: `leaflet`, barcha kuryerlar joylashuvi, "aloqa uzildi"
- [x] **Task 6 — Frontend: kuryer rejimi (`apps/web`)**: marshrut ro'yxati, "Yetkazildi", GPS yuborish, Wake Lock
- [x] **Task 7 — Frontend: do'kon kuzatish+qabul+qaytarish (`apps/shop`)**: `socket.io-client`, mini-xarita, qabul/qaytarish formalari

Faza 7 "Natija" mezoni (PLAN.md): kuryer nuqtasi xaritada jonli siljiydi; do'kon PWA'da farq belgilab qabul qiladi.
