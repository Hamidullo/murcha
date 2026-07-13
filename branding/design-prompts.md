# MURCHA — Frontend dizayn promptlari (Google Stitch + Claude)

> Ishlatish: avval **Brend-kontekst** blokini nusxala, keyin kerakli ekran promptini qo'sh. Stitch — bitta prompt = bitta ekran. Claude (claude.ai artifacts) — bitta promptda butun sahifa HTML/Vue so'rash mumkin.
> Promptlar inglizcha (ikkala vosita ham inglizchada eng yaxshi ishlaydi), UI matnlari o'zbekcha bo'lishi promptda aytilgan.

---

## 0. Brend-kontekst (har promptning boshiga qo'shiladi)

```
Brand: "Murcha" — B2B warehouse & ordering SaaS for Uzbekistan.
Mascot: friendly cartoon ant carrying a box (hardworking, fast).
Colors: primary amber #F59E0B, dark brown #4A2B12 (text/ant), cream #FFF8F0 (surfaces), white background; dark mode variant with deep brown-black background.
Typography: modern rounded sans (Nunito / Baloo-like), bold headings.
Style: clean, modern SaaS like Linear/Stripe — generous whitespace, 12px radius cards, soft shadows, subtle amber accents. NOT generic purple-gradient AI look.
All UI text in Uzbek (Latin script). Currency: UZS (format: 1 250 000 so'm).
```

---

## 1. Landing sahifa (murcha.uz) — desktop + mobil

**Stitch prompt:**

```
Marketing landing page for "Murcha" B2B warehouse SaaS.
Hero: left side — bold headline "Savdoga ulgur!", subheadline "Ombor, zakaz va qarzlar — bitta tizimda", primary amber CTA button "Bepul boshlash", secondary "Demo ko'rish"; right side — cute ant mascot carrying a box + floating app screenshot mockup.
Below hero: problem strip "Do'konlaringiz hali ham Telegram'da zakaz beradimi?" with 3 pain points.
Features section: 3 cards with icons — "B2B zakaz portali", "Qarz (nasiya) nazorati", "Kuryerlar jonli xaritada".
Pricing table: 4 tiers (Bepul, Start, Biznes, Korporativ), amber highlight on Start.
FAQ accordion, footer with contacts and Telegram link.
Light theme, lots of whitespace, playful but professional.
```

## 2. Ega dashboardi (app.murcha.uz) — desktop

**Stitch prompt:**

```
Desktop admin dashboard screen for warehouse owner.
Top bar: company logo placeholder, global search (Ctrl+K hint), notification bell, user avatar.
Left sidebar: icons+labels in Uzbek — Dashboard, Zakazlar, Mahsulotlar, Sklad, Qarzlar, Moliya, Hisobotlar, Sozlamalar.
Main area, 4 stat cards row: "Bugungi sotuv" (large sum + sparkline), "Kassa qoldig'i", "Umumiy qarzdorlik" (amber warning tint), "Muddati o'tgan qarzlar" (red tint).
Below: left 2/3 — line chart "Sotuv dinamikasi" (30 days, amber line); right 1/3 — list "Tugayotgan mahsulotlar" with low-stock badges.
Bottom: table "So'nggi zakazlar" — columns: raqam, do'kon, summa, status (colored pills: yangi=blue, yig'ilmoqda=amber, yo'lda=purple, yetkazildi=green).
Clean data-dense but airy layout, cream card backgrounds.
```

## 3. Do'kon PWA — katalog + savat (shop.murcha.uz) — mobil

**Stitch prompt:**

```
Mobile PWA screen: B2B product catalog for shop owner ordering from supplier warehouse.
Top: sticky header with warehouse name selector, search bar, cart icon with badge.
Category chips horizontal scroll (Ichimliklar, Shirinliklar, Kir yuvish...).
Product cards in 2-column grid: product photo, name (Uzbek), price per unit "12 500 so'm / dona", unit switcher chip (dona/blok), stepper (- 0 +) to add quantity directly on card.
Sticky bottom bar: "Savat · 14 mahsulot · 1 250 000 so'm" amber button.
Bottom navigation: Katalog, Zakazlarim, Qarzim, Profil.
Big touch targets, one-hand friendly, light theme.
```

**Stitch prompt (savat/checkout):**

```
Mobile PWA cart screen "Savat".
List of items: thumbnail, name, unit price, quantity stepper, line total, swipe-to-delete hint.
Summary card: Jami, Chegirma, To'lash muddati "15 kun (nasiya)" info row with amber icon.
Credit limit indicator: progress bar "Limit: 32 mln / 50 mln so'm ishlatilgan".
Big amber button "Zakaz berish", secondary "Saqlash".
Offline hint chip at top: "Internet yo'q — zakaz saqlanadi, ulanishda yuboriladi".
```

## 4. Do'kon PWA — qarz ekrani — mobil

**Stitch prompt:**

```
Mobile screen "Mening qarzim" for shop in B2B app.
Top: big balance card — "Jami qarz: 18 400 000 so'm", due date info, red badge "Muddati o'tgan: 2 100 000 so'm".
Aging bars: 0-15 kun / 16-30 / 31-60 / 60+ with amounts.
Transaction list grouped by month: each row — icon (zakaz=box, to'lov=check), title, date, amount (+red for debt, -green for payment).
Button "Solishtirish akti (PDF)".
Clean fintech feel, trustworthy.
```

## 5. Sklad — zakazlar navbati + pick list — desktop

**Stitch prompt:**

```
Desktop warehouse operator screen: incoming B2B orders queue.
Left: orders list with status filter tabs (Yangi 12, Yig'ilmoqda 5, Yo'lda 8). Each order card: number, shop name, items count, total, elapsed time, credit-limit warning icon if exceeded.
Right: selected order detail — pick list table: checkbox, product photo, name, location (A-3 polka), ordered qty "5 blok (100 dona)", picked qty stepper, barcode scan status icon.
Top action buttons: "Tasdiqlash", "Pick list chop etish", "Kuryerga biriktirish".
Progress bar "12/18 yig'ildi". Amber accents, scanner-friendly large rows.
```

## 6. Kuryer — dostavka ro'yxati + jonli xarita — mobil

**Stitch prompt:**

```
Mobile courier delivery screen, map-first layout.
Top 60%: map with numbered amber pins (delivery stops), courier location dot, current route highlighted.
Bottom sheet (draggable): today's stops list — each row: order number, shop name, address, amount to collect "Naqd: 850 000 so'm", status chip.
Active stop card expanded: "Yetkazildi" big green button, "Muammo" secondary, phone call icon.
Footer stats: "5/9 nuqta · Yig'ilgan naqd: 3 200 000 so'm".
High contrast for outdoor sunlight use, large buttons.
```

## 7. Mahsulot forma (admin) — desktop

**Stitch prompt:**

```
Desktop product editing form in warehouse admin, two-column layout.
Left column cards: "Asosiy" (name uz/ru, SKU, category tree select, brand), "Narxlar" (table: narx turi / narx / valyuta UZS-USD toggle), "O'lchov birliklari" (rows: 1 blok = 20 dona, add row button), "Shtrix-kodlar" (list + scan button).
Right column: image uploader with drag-drop and thumbnails grid, "Hisob" card (min qoldiq, QQS %, IKPU kod), status toggle Aktiv/Arxiv.
Sticky footer: "Saqlash" amber button, "Bekor qilish".
Form feels light despite many fields — grouped cards, clear section titles in Uzbek.
```

## 8. Login + onboarding — mobil

**Stitch prompt:**

```
Mobile login screen: centered ant mascot illustration, "Murcha" wordmark, tagline "Savdoga ulgur!".
Phone number input with +998 prefix, password field, amber "Kirish" button, link "Ro'yxatdan o'tish".
Second screen — onboarding checklist after signup: progress steps with checkmarks — "Sklad qo'shing", "Mahsulotlarni yuklang (Excel)", "Do'kon qo'shing", "Birinchi zakaz" — each with illustration of ant mascot doing the task, "Boshlash" buttons.
Warm, welcoming, cream background.
```

---

## Claude (claude.ai / artifacts) uchun qo'shimcha ko'rsatma

Claude'dan **ishlaydigan HTML/Vue prototip** so'ralganda brend-kontekst + ekran promptiga shu qatorlarni qo'sh:

```
Build this as a single self-contained HTML file with Tailwind CSS (CDN), Uzbek UI text, realistic sample data (Uzbek product names: Coca-Cola 1.5L, Nestle suv 0.5L, Olmos un 2kg...), working interactions (tabs, steppers, modals) in vanilla JS. Mobile viewport 390px for PWA screens, 1440px for desktop screens. Include dark mode toggle. Use the exact brand colors as CSS variables.
```

**Maslahatlar:**

- Stitch'da bitta promptga bitta ekran — ko'p ekran so'rasang sifat tushadi
- Stitch natijasini "Refine" bilan boyitish: "make stat cards bigger", "add empty state"
- Claude'da iteratsiya oson: prototip → "savat bo'sh holatini qo'sh", "dark mode to'g'irla"
- Ikkala vositadan chiqqan dizayn — **referens**, yakuniy kod baribir shadcn-vue + dizayn-tizim tokenlari bilan yoziladi (PLAN.md dizayn bo'limi)
- Yakuniy ekranlar Impeccable `polish`/`critique` + taste-skill audit'dan o'tadi
