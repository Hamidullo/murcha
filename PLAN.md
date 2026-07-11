# MURCHA — Universal sklad boshqaruvi va B2B zakaz platformasi. To'liq loyiha rejasi

## 1. Kontekst

Bozorda sklad dasturlari ko'p (MoySklad, Billz, Smartup, 1C, Zoho...), lekin ularning aksariyati **skladni ichkaridan** boshqaradi. Bizning asosiy farqlovchi g'oya:

1. **B2B zakaz portali** — skladdan mahsulot oladigan sotuv nuqtalari (do'konlar, filiallar, dilerlar) o'z telefonidan/kompyuteridan to'g'ridan-to'g'ri skladga (yoki bir nechta skladga) zakaz bera oladi, zakaz holatini kuzatadi, qabul qilib oladi.
2. **Budjet shaffofligi** — pul qayerdan kelib qayerga ketayotgani, qarzdorliklar, foyda — hammasi real vaqtda ko'rinadi.
3. **O'zbekiston-first** — ЭСФ (didox/faktura.uz), Payme/Click, UZS, uz/ru tillari — lokal integratsiyalar chuqur qilinadi.

Kod hali yozilmaydi — bu hujjat bozor tahlili, arxitektura va bosqichma-bosqich ish rejasi.

---

## 2. Bozor tahlili

### Asosiy raqobatchilar (O'zbekiston)

| Dastur | Kuchli tomoni | Zaif tomoni (bizning imkoniyat) |
|---|---|---|
| **MoySklad** (moysklad.uz) | 2007-dan beri, keng funksional, bepul tarif, Toshkentda ofis | Rossiya mahsuloti, interfeys og'ir, B2B zakaz portali kuchsiz, lokalizatsiya to'liq emas |
| **Billz** (billz.io) | Chakana savdo (kiyim, poyabzal) uchun kuchli POS, lokal kompaniya | Sklad-diler zanjiri emas, asosan bitta do'kon avtomatizatsiyasi; universal emas |
| **Smartup** (smartup.uz) | Distributsiya/agentlar uchun kuchli, 1C/SAP integratsiya | Narxi yuqori, kichik biznes uchun murakkab, UX eskirgan |
| **1C** | Standart, buxgalterlar biladi | Bulutli emas (asosan), qimmat joriy etish, mobil UX yo'q |
| **Zoho Inventory / global SaaS** | Zamonaviy UX | O'zbekiston integratsiyalari yo'q (ЭСФ, Payme), uz tili yo'q |

### Xulosa — bizning nisha
Hech kim **"ko'p sklad + sotuv nuqtalari zanjirini bitta tizimda"** to'liq yechmagan:
- Distribyutor 3 ta skladga ega, 40 ta do'kon shulardan mahsulot oladi — hozir bu Excel/Telegram orqali qilinadi.
- Do'kon o'zi zakaz bersin, sklad yig'sin, dostavka kuzatilsin, qarzdorlik avtomatik hisoblansin — mana shu bizning asosiy oqim (killer feature).
- Qo'shimcha ustunlik: zamonaviy tez UX (PWA), shaffof arzon narx, o'zbek tili birinchi o'rinda.

### Maqsadli mijozlar
1. **Distribyutorlar/ulgurji** — sklad + dilerlar tarmog'i (asosiy segment)
2. **Tarmoq do'konlari** — markaziy sklad + filiallar
3. **Ishlab chiqaruvchilar** — tayyor mahsulot skladi + sotuv nuqtalari
4. **Oddiy yakka sklad/do'kon** — kirish darajasidagi tarif bilan

---

## 3. Biznes-model: uchala model bitta arxitekturada

| Model | Qanday ishlaydi | Texnik asos |
|---|---|---|
| **SaaS obuna** (asosiy) | Bulutda, oylik tarif: Bepul (1 sklad, 1 user) → Start → Biznes → Korporativ | Multi-tenant: bitta PostgreSQL, har jadvalda `company_id`, so'rovlar tenant bo'yicha izolyatsiya qilinadi |
| **Self-hosted** | Korxona o'z serveriga o'rnatadi (yillik litsenziya) | Xuddi shu Docker Compose to'plami, litsenziya kaliti bilan aktivatsiya |
| **Bir martalik litsenziya** | Self-hosted'ning "umrbod" varianti, yangilanishlar alohida | Yuqoridagi bilan bir xil, faqat litsenziya turi farq qiladi |

Muhim: kod bazasi **bitta** — deploy rejimi konfiguratsiya (env) orqali tanlanadi. Multi-tenant SaaS rejimida ko'p kompaniya, self-hosted rejimida bitta kompaniya ishlaydi.

---

## 4. Foydalanuvchi rollari

1. **Super-admin** (biz) — tariflar, kompaniyalar, monitoring
2. **Kompaniya egasi** — hamma narsani ko'radi, budjet/hisobotlar
3. **Sklad menejeri** — kirim/chiqim, inventarizatsiya, zakazlarni yig'ish
4. **Sotuv nuqtasi (do'kon) operatori** — zakaz beradi, qabul qiladi, o'z qoldiqlarini ko'radi
5. **Skladchi (yig'uvchi)** — pick list bo'yicha zakaz yig'adi, skanerlaydi
6. **Kuryer/ekspeditor** — dostavka ro'yxati, yetkazib berish statusi
7. **Buxgalter** — moliya, ЭСФ, hisob-kitoblar

## 5. Funksional modullar

### MVP (1-bosqich) — bozordagi "eng zarur" funksiyalar + killer feature

**A. Sklad yadrosi (hozirgi dasturlarda bor bo'lgan zarur funksiyalar):**

*Mahsulot kartochkasi — to'liq ma'lumot modeli:*
- **Identifikatsiya**: nomi (uz/ru), SKU (artikul), **bir nechta shtrix-kod** (bir mahsulotning turli o'ramlarida turli kod bo'ladi), kategoriya (daraxt ko'rinishida), brend, ishlab chiqaruvchi/mamlakat, tavsif
- **Rasmlar**: bir nechta rasm (asosiysi belgilanadi), yuklashda avtomatik siqish + thumbnail (sharp), katalogda tez ochilishi uchun
- **O'lchov birliklari**: asosiy birlik (dona, kg, litr, metr, qop, quti...) + **o'ram konvertatsiyasi** — masalan 1 blok = 20 dona, 1 quti = 12 blok; do'kon blokda zakaz beradi, sklad donada hisoblaydi — tizim avtomatik o'giradi; kasr miqdorlar qo'llab-quvvatlanadi (2.5 kg)
- **Narxlar (bir nechta tur)**: kelish narxi (o'rtacha tannarx avtomatik), ulgurji, chakana, maxsus narx turlari (masalan "VIP dilerlar") — har sotuv nuqtasiga qaysi narx turi tegishli ekani biriktiriladi; chegirma foizi; narx tarixi saqlanadi (kim, qachon, qancha o'zgartirdi)
- **Fizik parametrlar**: og'irlik, hajm (dostavka rejalashtirishda kerak), o'ram o'lchamlari
- **Hisob parametrlari**: minimal qoldiq (sklad bo'yicha alohida sozlanadi), minimal zakaz miqdori va karra (masalan faqat blokda), QQS stavkasi, ИКПУ kodi (ЭСФ uchun kerak bo'ladi — maydon boshidan qo'yiladi)
- **Partiya/srok**: yaroqlilik muddati bo'yicha hisob (FEFO — muddati yaqini birinchi chiqadi), partiya raqami
- **Variantlar**: rang/o'lcham kombinatsiyalari (kiyim-poyabzal uchun) — har variant o'z shtrix-kodi va qoldig'i bilan
- **Qo'shimcha maydonlar (custom fields)**: har biznes o'ziga kerakli maydon qo'sha oladi (masalan "sertifikat raqami") — JSONB'da saqlanadi
- Holat: aktiv/arxiv (arxivdagisi katalogda ko'rinmaydi, tarixda qoladi)

*Sklad operatsiyalari:*
- Ko'p sklad: har sklad bo'yicha qoldiq, sklad ichida joylashuv (bo'lim/polka)
- **Postavshchik zakazi (purchase order)**: tugayotgan mahsulotlar asosida xarid zayavkasi → postavshchikga yuboriladi → kelganda kirim shu zakaz asosida qabul qilinadi (farqlar bilan)
- Kirim (postavshchikdan qabul) / Chiqim (sotuv) / Spisaniye / Skladlararo ko'chirish
- Inventarizatsiya (ro'yxatga solish, farqlar akti)
- Shtrix-kod skaneri (telefon kamerasi orqali PWA'da + USB skaner)
- Minimal qoldiq ogohlantirishi (low-stock alert)

**B. B2B zakaz portali (killer feature):**

Do'kon uchun **alohida yengil PWA ilova** — `shop.murcha.uz` (`apps/shop`): sklad ilovasidan mustaqil, faqat do'konga kerakli ekranlar, telefonga o'rnatiladi, kichik va tez yuklanadi. Do'kon operatori murakkab sklad interfeysini umuman ko'rmaydi. Telegram-bot (2-bosqich) bunga qo'shimcha kanal bo'ladi, o'rnini bosmaydi.

Do'kon PWA ekranlari: katalog (o'z narxlari bilan) → savat → zakaz; zakazlarim (status + xaritada kuzatish); qabul qilish (skaner bilan); qarz balansim va to'lov tarixim; bildirishnomalar.

- Do'kon operatori katalogni ochadi → savatga qo'shadi → zakaz beradi (bir yoki bir nechta skladdan)
- Zakaz statuslari: `yangi → tasdiqlandi → yig'ilmoqda → yo'lda → yetkazildi → qabul qilindi`
- Sklad tomonda: zakazlar navbati, yig'ish varag'i (pick list), qisman yuborish
- Do'kon tomonda: qabul qilishda farqlarni belgilash (kam keldi/shikastlangan)
- Real-time bildirishnomalar (yangi zakaz, status o'zgardi)
- Do'kon uchun individual narx/chegirma darajalari, minimal zakaz miqdori

**C. Qarz (nasiya) boshqaruvi — MVP'ning muhim ustuni:**

O'zbekistonda ulgurji savdo asosan qarzga ishlaydi (sklad do'konga nasiyaga beradi, do'kon sotgach to'laydi). Shuning uchun bu alohida chuqur modul:
- **Kredit limiti**: har do'kon/kontragentga individual limit (masalan 50 mln so'm). Limit oshsa — yangi zakaz avtomatik bloklanadi yoki egadan tasdiq so'raladi (sozlanadi)
- **To'lov muddati (payment terms)**: har zakazga muddat (masalan 15/30 kun). Muddati o'tgan qarz — "muddati o'tgan" (overdue) sifatida qizil belgilanadi
- **Qarz yoshi hisoboti (aging report)**: qarzlar 0–15 / 16–30 / 31–60 / 60+ kun kesimida — kimdan qancha, qachondan beri
- **Qisman to'lovlar**: to'lov bir nechta zakazga taqsimlanadi (FIFO — eng eski qarzdan boshlab) yoki qo'lda biriktiriladi
- **Realizatsiya (konsignatsiya) rejimi**: mahsulot do'konga beriladi, qarz sotilgan miqdor bo'yicha hisoblanadi, sotilmagani qaytariladi
- **Solishtirish dalolatnomasi (акт сверки)**: davr bo'yicha kontragent bilan hisob-kitob akti — PDF chiqarish
- **Avtomatik eslatmalar**: to'lov muddati yaqinlashganda/o'tganda egaga va qarzdor do'konga bildirishnoma (keyinroq Telegram/SMS)
- **Do'kon o'z qarzini ko'radi**: do'kon PWA'sida (`apps/shop`) o'z balansini, to'lov tarixini, muddatlarini ko'radi — shaffoflik ikki tomonlama
- Qarz tarixi immutable jurnalda (`debt_movements`): har zakaz, to'lov, qaytarish — alohida yozuv, balans shulardan hisoblanadi

**D. Asosiy moliya (budjet shaffofligi):**
- Kassa/hisob raqamlar, kirim-chiqim operatsiyalari, xarajat kategoriyalari
- Zakaz ↔ to'lov bog'lanishi (qisman to'lov ham)
- Hisobotlar: sotuv dinamikasi, foyda (marja), top mahsulotlar, sklad aylanmasi, qarzdorlik reestri
- Dashboard: bugungi sotuv, kassa qoldig'i, kutilayotgan zakazlar, **umumiy qarzdorlik va muddati o'tganlar**

**E. Hodimlar boshqaruvi (self-service):**

Biznes egasi hech kimga murojaat qilmasdan o'z jamoasini o'zi tuzadi:
- Hodim yaratish: ism, telefon, rol tanlash — hodimga SMS/link orqali kirish yuboriladi
- Tayyor rollar (sklad menejeri, skladchi, do'kon operatori, kuryer, buxgalter) + **maxsus rol yaratish**: ruxsatlar matritsasi (qaysi modulni ko'radi/o'zgartiradi)
- Hodimni aniq sklad(lar)ga yoki sotuv nuqta(lar)iga biriktirish — faqat o'z obyektini ko'radi
- Bloklash/aktivlashtirish, parol tiklash, hodim faoliyati tarixi (audit log bilan bog'liq)
- Hodimlar kesimida statistika: kim qancha zakaz yig'di, kim qancha sotdi

**F. Dostavka va kuryerlar xaritada (jonli kuzatuv):**
- Zakaz yig'ilgach kuryerga biriktiriladi (qo'lda yoki navbat bo'yicha)
- Kuryer o'z ro'yxatini ko'radi (`apps/web` ichidagi kuryer rejimi, PWA): manzillar, mahsulotlar, qarz/to'lov summasi
- **Jonli xarita**: kuryer telefoni GPS koordinatani yuboradi (Geolocation API + Socket.IO), egasi/dispetcher xaritada barcha kuryerlarni real vaqtda ko'radi
- **Muhim cheklov (halol yozamiz)**: brauzer PWA ekran o'chiq/fon rejimda GPS yubora olmaydi (ayniqsa iOS). MVP yechimi: kuryer ekranida **Screen Wake Lock** (ekran o'chmaydi) + "dostavka paytida ilova ochiq tursin" UX; ilova yopilsa oxirgi nuqta + "aloqa uzildi" statusi ko'rinadi. To'liq fon-tracking kerak bo'lsa — 2-bosqichda Capacitor native wrapper
- Do'kon ham o'z zakazi qayerda ekanini xaritada ko'radi ("yo'lda" statusida, do'kon PWA'sida)
- Yetkazish tasdig'i: do'kon qabul qilganda imzo/kod, farqlar akti shu yerda
- Xarita: **Leaflet + OpenStreetMap** (bepul, O'zbekiston xaritasi yaxshi qoplangan); keyinroq Yandex Maps varianti
- Kuryer kunlik hisoboti: nechta nuqta, qancha pul yig'di (naqd qabul qilingan to'lovlar kassaga kirim bo'ladi)

**G. Chop etish (printing) — skladda kundalik ehtiyoj:**
- Hujjatlar: nakladnaya (yuk xati), kirim/chiqim akti, pick list, solishtirish akti — PDF, A4 va termoprinter formatlarida, **kompaniya logosi va rekvizitlari bilan**
- **Shtrix-kod yorliqlari (etiketka)**: mahsulot yorliqlarini termoprinterda chop etish (narx, nom, kod) — o'lchamlari sozlanadi
- Texnik yondashuv: brauzer ESC/POS'ga to'g'ridan-to'g'ri chiqara olmaydi — **MVP'da hamma chop etish yorliq/chek o'lchamidagi PDF orqali** (tizim drayveri bosadi); to'g'ridan-to'g'ri termoprinter (qz-tray) — 2-bosqichda
- Zakaz cheki/kvitansiyasi do'kon uchun

**H. Valyuta (O'zbekiston reallik):**
- Asosiy valyuta UZS, lekin **kelish narxlari ko'pincha USD'da** (import mahsulotlar)
- Mahsulot narxi USD'da belgilanishi mumkin — sotuvda MB (CBU) kursi yoki kompaniyaning ichki kursi bo'yicha so'mga o'giriladi
- CBU kursi har kuni avtomatik yangilanadi (cbu.uz API), ichki kursni ega o'zi belgilashi ham mumkin
- Postavshchikga qarz USD'da yuritilishi mumkin (valyutali qarz)

**I. Tizim:**
- **Kompaniya brendingi**: ega o'z logosini yuklaydi (kompaniya sozlamalarida) — logo ilova sarlavhasida, barcha chop etiladigan hujjatlarda (nakladnaya, akt, chek, solishtirish akti), vitrinada va do'konlarga boradigan bildirishnomalarda ko'rinadi; brend rangini tanlash ham mumkin
- Auth: telefon raqam + parol, JWT, rollar/ruxsatlar (RBAC)
- Bir foydalanuvchi bir nechta kompaniyada ishlashi mumkin (kompaniya tanlash)
- Kompaniya ro'yxatdan o'tishi (o'z skladlari va nuqtalarini qo'shadi)
- Audit log (kim nimani o'zgartirdi)
- uz (lotin) / ru tillari
- Excel import/export (mahsulotlar, qoldiqlar, kontragentlar)
- **Bildirishnomalar**: ilova ichida + **Web Push** (PWA — ilova yopiq bo'lsa ham telefonga keladi: yangi zakaz, to'lov muddati, tugayotgan mahsulot); SMS — hodim taklifi va kritik ogohlantirishlar uchun (**Eskiz.uz** — lokal SMS provayder)
- Demo-rejim: ro'yxatdan o'tganda tayyor namunaviy ma'lumotlar bilan sinab ko'rish

**J. Kompaniya vitrinasi — har biznes egasi uchun o'z landing sahifasi:**

Har kompaniya bir tugma bilan o'zining ochiq (public) sahifasini yoqadi — `murcha.uz/nomi` manzilida:
- Logo, kompaniya tavsifi, telefon/manzil, xaritada joylashuv, ish vaqti
- **Ochiq katalog (ixtiyoriy)**: ega qaysi mahsulotlar va qaysi narx turi (masalan chakana) ko'rinishini o'zi tanlaydi; qoldiq ko'rsatish yoqib/o'chiriladi
- **"Zakaz so'rovi" formasi**: yangi potensial mijoz (hali tizimda yo'q do'kon) telefon qoldirib zakaz so'raydi → egaga lid sifatida tushadi → ega uni sotuv nuqtasi sifatida qo'shsa, u portal orqali ishlay boshlaydi — **bu bizga ham yangi foydalanuvchi olib keladi (viral o'sish)**
- Dizayn shablonlari (2–3 tayyor mavzu, ranglarni sozlash), telefon uchun optimallashtirilgan
- SEO: har vitrina indeksatsiya qilinadi — kompaniyaga ham, bizga ham bepul trafik. Muhim: SPA'ni qidiruv tizimlari yaxshi ko'rmaydi, shuning uchun **vitrina sahifalari server tomonda render qilinadi** (Express'da oddiy template/SSR yoki build paytida prerender) — asosiy ilova SPA bo'lib qolaveradi
- 2-bosqichda: o'z domenini ulash (masalan `optom-savdo.uz`), Telegram'ga ulash

**K. Super-admin panel va tariflar (SaaS boshqaruvi, minimal MVP):**
- Kompaniyalar ro'yxati: holati, tarifi, oxirgi aktivlik, statistika
- Tarif limitlari kod darajasida tekshiriladi (masalan Bepul: 1 sklad, 1 user, 100 mahsulot; Start: 2 sklad, 5 user...) — limit oshganda yuqori tarifga o'tish taklif qilinadi
- Obuna muddati va holati (MVP'da to'lov qo'lda tasdiqlanadi — bank o'tkazmasi; Payme/Click avtomatik to'lov 2-bosqichda)
- Muddati tugagan kompaniya: yozish bloklanadi, o'qish ochiq qoladi (ma'lumot garovga olinmaydi — ishonch)

**Scope-kesish ro'yxati (agar pilot muddati siqilsa)** — bularsiz ham pilot to'liq ishlaydi, birinchi bo'lib keyinga suriladi: mahsulot variantlari (rang/o'lcham), partiya/FEFO, realizatsiya (konsignatsiya), kompaniya vitrinasi. Qolgan hamma narsa — pilot uchun majburiy.

### 2-bosqich (MVP'dan keyin)
- **ЭСФ integratsiya** (didox.uz yoki faktura.uz API) — yuridik shaxslar uchun majburiy hujjatlar
- Payme/Click orqali obuna to'lovi + mijozlar o'rtasida to'lov
- POS rejim (do'kon kassasi) — Billz bilan raqobat
- To'liq budjetlash: plan/fakt, xarajat markazlari, cash-flow prognoz
- Kuryer marshrutini optimallashtirish (eng qisqa yo'l bo'yicha tartiblash)
- Telegram-bot (zakaz status, kunlik hisobot) — do'kon PWA'siga qo'shimcha kanal, o'rnini bosmaydi
- Ishlab chiqarish moduli (xomashyo → tayyor mahsulot)
- Markirovka (asl belgisi) integratsiyasi
- Capacitor native wrapper (kuryer fon-GPS uchun), qz-tray (to'g'ridan-to'g'ri termoprinter)
- **Marketplace rejimi**: bitta do'kon tizimdagi bir nechta distribyutor-kompaniyadan zakaz bera oladi (hozircha do'kon bitta kompaniyaga tegishli) — tarmoq effekti: qancha ko'p distribyutor, shuncha qimmatli platforma

---

## 6. Biznes jarayonlari (workflow) — dastur real ish oqimini aks ettiradi

Dastur modullar yig'indisi emas — quyidagi real jarayonlar UI'da xuddi shu ketma-ketlikda qurilgan bo'ladi.

### 6.1. Asosiy tovar sikli (end-to-end)

```
Postavshchikdan xarid → Kirim (skladga qabul) → Saqlash/joylash
     → Do'kon zakazi → Tasdiqlash → Yig'ish (pick list) → Dostavka
     → Do'kon qabul qiladi → Qarz yoziladi → To'lov → Hisobot
```

Har bosqichda kim mas'ul, qaysi hujjat yaratiladi va pul/qoldiq qanday o'zgaradi — tizim shuni avtomatik yuritadi:

| Bosqich | Kim | Hujjat | Qoldiq/pul o'zgarishi |
|---|---|---|---|
| Xarid | Ega/menejer | Zakaz postavshchikga | — (kutilmoqda) |
| Kirim | Sklad menejeri | Kirim akti | Sklad qoldig'i ↑, postavshchikga qarz ↑ |
| Do'kon zakazi | Do'kon operatori | Zakaz | — (rezerv qilinadi) |
| Tasdiqlash | Sklad menejeri/ega | — | Kredit limit tekshiriladi |
| Yig'ish | Skladchi | Pick list | Rezerv → yig'ilgan |
| Dostavka | Kuryer | Yo'l varag'i | Qoldiq ↓ (skladdan chiqdi) |
| Qabul | Do'kon operatori | Qabul akti (farqlar bilan) | Do'kon qarzi ↑ |
| To'lov | Kuryer (naqd) / bank | To'lov hujjati | Kassa ↑, qarz ↓ |

### 6.2. Har bir rolning kunlik ish oqimi (UI shu asosda quriladi)

**Biznes egasi (ertalab 5 daqiqada holatni ko'radi):**
Dashboard: kecha qancha sotildi, kassada qancha, umumiy qarzdorlik, muddati o'tganlar, tugayotgan mahsulotlar → kerak bo'lsa zakaz limitini tasdiqlaydi → hafta oxiri hisobotlar.

**Sklad menejeri:**
Ertalab yangi zakazlar navbatini ochadi → tasdiqlab pick list yaratadi → skladchilar yig'adi (shtrix-kod bilan tekshirib) → kuryerga biriktiradi → kun davomida kirimlarni qabul qiladi → smena oxirida tugayotgan mahsulotlarga xarid zayavkasi.

**Do'kon operatori (do'kon PWA — shop.murcha.uz, telefonda 3 daqiqada):**
Katalogni ochadi (o'z narxlari bilan) → savat → zakaz → statusni kuzatadi (xaritada) → kelganda skanerlab qabul qiladi, farq bo'lsa belgilaydi → o'z qarzini/muddatini ko'radi.

**Kuryer:**
Kunlik ro'yxat: manzillar tartibi → har nuqtada topshiradi, naqd oladi (summa dasturda) → kun oxirida "inkassatsiya": yig'ilgan naqd kassaga topshiriladi, tizim solishtiradi.

**Buxgalter:**
Bank ko'chirmasi bo'yicha to'lovlarni kiritadi → to'lovlarni zakazlarga taqsimlaydi → solishtirish aktlari → (2-bosqichda ЭСФ yuboradi).

### 6.3. Istisno va maxsus jarayonlar (ko'p dasturlarda unutiladi, bizda MVP'da)

- **Qaytarish (vozvrat)**: do'kon sotilmagan/muddati o'tayotgan mahsulotni qaytaradi → qaytarish hujjati → sklad qoldig'i ↑, do'kon qarzi ↓
- **Brak/shikastlangan**: qabulda yoki skladda aniqlansa → spisaniye akti sabab bilan → yo'qotishlar hisobotida ko'rinadi (shaffoflik!)
- **Qisman yetkazish**: skladda 100 tadan 60 tasi bor → zakaz qisman yuboriladi, qolgani backorder sifatida kutadi yoki bekor qilinadi (sozlanadi)
- **Kun yopish (smena)**: kassa qoldig'i sanaladi, tizim kutilgan bilan solishtiradi, farq bo'lsa akt — har kuni pul intizomi
- **Inventarizatsiya jarayoni**: sklad "sanoq rejimi"ga o'tadi → skanerlab sanaladi → tizim farqlar ro'yxatini chiqaradi → ega tasdiqlaydi → farqlar spisaniye/kirim bilan tuzatiladi
- **Narx o'zgarishi**: yangi kirim boshqa narxda kelsa — o'rtacha tannarx avtomatik qayta hisoblanadi (foyda hisoboti to'g'ri bo'lishi uchun)
- **Zakazni bekor qilish**: qaysi bosqichda bo'lsa ham rezerv/qoldiq/qarz to'g'ri orqaga qaytariladi (storno)

### 6.4. Onboarding oqimi (yangi mijoz 15 daqiqada ishga tushadi)

1. Ro'yxatdan o'tish (telefon + kompaniya nomi) → 2. Sklad(lar)ini qo'shadi → 3. Mahsulotlarni Excel'dan import qiladi yoki qo'lda → 4. Boshlang'ich qoldiqlarni kiritadi (bu maxsus "boshlang'ich kirim" hujjati) → 5. Do'konlari va hodimlarini qo'shadi — hodimlarga sklad ilovasi (app.murcha.uz), do'kon operatorlariga do'kon PWA'si (shop.murcha.uz) linki SMS orqali boradi → 6. Birinchi zakaz. Har qadamda interaktiv yo'riqnoma (onboarding checklist).

---

## 7. Texnik arxitektura

### Stack (siz so'ragan + zamonaviy qo'shimchalar)

| Qatlam | Texnologiya | Izoh |
|---|---|---|
| Frontend | **Vue 3.5** (Composition API, `<script setup>`) + **JavaScript** + **Vite** | Eng yangi Vue yondashuvi; TypeScript emas — kod o'qish oson, keyinchalik bosqichma-bosqich TS'ga o'tish mumkin |
| UI | **TailwindCSS 4** + **shadcn-vue (Reka UI)** | Zamonaviy, to'liq moslashtiriladigan komponentlar |
| Animatsiya | **motion-v (Motion for Vue)** | Silliq o'tishlar, mikro-animatsiyalar (bitta kutubxona yetadi — dublikat yo'q) |
| Grafikalar | **Apache ECharts (vue-echarts)** | Dashboard: sotuv dinamikasi, interaktiv grafikalar |
| Ikonlar | **Lucide** (lucide-vue-next) | Yagona uslubdagi zamonaviy ikonlar |
| Utility | **VueUse** | 200+ tayyor composable (offline holat, skaner, storage...) |
| State | **Pinia** + **TanStack Query** | Lokal holat + server ma'lumotlari keshi |
| PWA | **vite-plugin-pwa** | `apps/shop` (do'kon) va `apps/web` (kuryer/sklad) ikkalasi PWA: offline rejim, telefonga o'rnatish |
| Backend | **Node.js 22 LTS + Express 5** + JavaScript (ES modules) | So'raganingizdek; **JSDoc** izohlari bilan muharrirda avtoto'ldirish TS'dagidek ishlaydi |
| ORM | **Prisma** | Kodni tushunish oson, migratsiyalar avtomatik, JavaScript bilan ham to'liq ishlaydi |
| DB | **PostgreSQL 17** | Multi-tenant (`company_id`), JSONB, full-text qidiruv |
| Cache/Queue | **Redis 7** + **BullMQ** | Sessiya, kesh, navbatlar (hisobot generatsiya, rasm siqish, bildirishnoma) |
| Real-time | **Socket.IO** | Yangi zakaz bildirishnomasi + kuryer GPS jonli uzatish |
| Xarita | **Leaflet + OpenStreetMap** | Kuryerlar jonli xaritada; bepul, API kalit shart emas |
| Proxy | **nginx** | SSL, static fayllar, rate-limit |
| Konteyner | **Docker + Docker Compose** | Dev va prod bir xil; self-hosted deploy shu orqali |
| Fayllar | **MinIO** (S3-compatible) | Mahsulot rasmlari — Docker'da o'zi ko'tariladi |
| Validatsiya | **Zod** | Frontend/backend umumiy sxemalar |

### Arxitektura sxemasi

```
[Do'kon PWA]     [Sklad/Ega ilovasi]    [Landing/Vitrina]
 apps/shop         apps/web + kuryer      apps/landing
      \                  |                  /
       ------------- nginx -----------------
                |               |
          [Express API]    [Socket.IO]
             |    |    \        |
        [PostgreSQL] [Redis] [BullMQ worker]
             |
          [MinIO]
```

- **Monorepo**: `apps/web` (Vue SPA/PWA — sklad/ega/buxgalter ilovasi + kuryer ekrani), `apps/shop` (**do'kon uchun alohida yengil PWA** — shop.murcha.uz: katalog, zakaz, kuzatish, qarz), `apps/landing` (Vue + vite-ssg — murcha.uz marketing sayti), `apps/api` (Express — ikkala ilovaga bitta API), `packages/shared` (Zod sxemalar, tiplar), `packages/ui` (umumiy komponentlar/dizayn-tizim — ikki ilova bir xil ko'rinishda) — pnpm workspaces
- API — REST, `/api/v1/...`, OpenAPI (Swagger) avtomatik hujjatlanadi; pagination, filter, sort — yagona standartda
- **Domen tuzilmasi (nginx routing)**: `murcha.uz` — landing + kompaniya vitrinalari (`/nomi`); `app.murcha.uz` — sklad/ega ilovasi; `shop.murcha.uz` — do'kon PWA; API hammasi uchun bitta — `api.murcha.uz` (auth/JWT umumiy: bitta hisob ikkala ilovada ishlaydi, rol qaysi ekranlarni ochishni belgilaydi)

### Kod arxitekturasi — SOLID va qatlamli tuzilma

Backend har modul (products, orders, debts...) bir xil qatlamli tuzilmada yoziladi — kodni o'qish va test qilish oson bo'ladi:

```
apps/api/src/modules/orders/
├── orders.routes.js       # Endpoint'lar ro'yxati (faqat marshrut)
├── orders.controller.js   # HTTP qatlam: request → DTO → service → response
├── orders.service.js      # BIZNES LOGIKA (limit tekshirish, status oqimi...)
├── orders.repository.js   # Faqat DB so'rovlari (Prisma shu yerda)
├── orders.schemas.js      # Zod DTO'lar (packages/shared'dan qayta ishlatiladi)
└── orders.test.js         # Unit testlar (service mock repository bilan)
```

SOLID qanday qo'llanadi:

- **S (Single Responsibility)**: controller faqat HTTP, service faqat biznes qoida, repository faqat DB — bitta fayl bitta sabab bilan o'zgaradi. Masalan qarz limiti qoidasi o'zgarsa, faqat `debts.service.js` o'zgaradi
- **O (Open/Closed)**: yangi funksiya mavjud kodni o'zgartirmasdan qo'shiladi. Masalan bildirishnoma kanallari: `NotificationChannel` interfeysi bor, `PushChannel`, `SmsChannel`, keyin `TelegramChannel` — yangi kanal = yangi klass, eski kod tegilmaydi. Xuddi shunday to'lov taqsimlash strategiyalari (FIFO/qo'lda), hujjat turlari
- **L (Liskov)**: har qanday `NotificationChannel`/`StorageProvider` (MinIO yoki lokal disk) bir-birining o'rnini buzilishsiz bosadi — self-hosted va SaaS shu tufayli bitta kod
- **I (Interface Segregation)**: katta interfeys emas, kichik maqsadli interfeyslar — kuryer moduli `OrderReader`gagina bog'lanadi, butun `OrderService`ga emas
- **D (Dependency Inversion)**: service'lar konkret klassga emas, interfeysga bog'lanadi; bog'liqliklar konstruktor orqali beriladi (**dependency injection** — yengil DI: awilix yoki qo'lda factory, NestJS og'irligisiz). Testda haqiqiy DB o'rniga mock repository qo'yiladi — testlar tez va izolyatsiyalangan

Qo'shimcha qoidalar:
- **Domen hodisalari (events)**: `order.confirmed`, `payment.received` kabi hodisalar EventEmitter/BullMQ orqali tarqaladi — bildirishnoma, audit, statistika modullar bir-biriga bog'lanmasdan eshitadi (loose coupling)
- **Yagona xato tizimi**: `AppError` ierarxiyasi (ValidationError, NotFoundError, InsufficientStockError...) → bitta error-handler middleware → klientga yagona formatda javob
- Frontend'da ham xuddi shu printsip: sahifa → composable (`useOrders()` — logika) → API klient qatlami; komponentlar faqat ko'rsatadi
- `packages/shared` — Zod sxemalar va tiplar **bitta joyda**: backend validatsiya qiladi, frontend forma tekshiradi, ikkalasi hech qachon farqlanmaydi (DRY)
- Lint qoidalari qatlam buzilishini ushlaydi (masalan controller'dan to'g'ridan-to'g'ri Prisma chaqirish taqiqlanadi — eslint import qoidasi)
- **Graphify skill** (graphify.net) — butun monorepo (JS kod + Prisma sxema + hujjatlar) so'rov berish mumkin bo'lgan bilim grafiga aylantiriladi: `/graphify` buyrug'i `graph.html` (interaktiv vizualizatsiya) va `GRAPH_REPORT.md` chiqaradi. Foydasi: (1) loyiha o'sganda modullar orasidagi bog'liqliklar ko'rinadi — SOLID qatlam buzilishlari va yashirin bog'lanishlar erta aniqlanadi, (2) AI-assistent kod bazasini chuqur tushunib ishlaydi, (3) yangi ishtirokchi loyihani graf orqali tez o'rganadi. Har fazadan keyin qayta ishga tushiriladi (inkremental kesh bor)

### Xavfsizlik (security)

- **Auth**: qisqa muddatli access token (JWT, 15 daq) + **refresh token rotation** (Redis'da, o'g'irlansa butun zanjir bekor qilinadi); parollar **argon2** bilan xeshlanadi
- **Multi-tenancy ikki qavat himoya**: (1) Prisma client extension har so'rovga `company_id` filtrini majburiy qo'shadi, (2) **PostgreSQL Row-Level Security (RLS)** — ORM'da xato bo'lsa ham baza boshqa kompaniya ma'lumotini qaytarmaydi. Texnik eslatma: RLS Prisma bilan har so'rovni `set_config('app.company_id', ...)` li tranzaksiyaga o'rashni talab qiladi — bu pattern **Faza 0'da bir marta yoziladi, izolyatsiya testi bilan qotiriladi**, keyin butun loyiha tayyor wrapper'dan foydalanadi
- **API himoyasi**: helmet (xavfsiz headerlar), CORS oq ro'yxat, rate-limit (Redis asosida, IP + user bo'yicha), barcha kirish ma'lumotlari Zod bilan validatsiya
- **RBAC** middleware darajasida: har endpoint ruxsat talab qiladi, frontend'dagi yashirish faqat UX uchun
- HTTPS majburiy (nginx + Let's Encrypt avtomatik yangilanish), maxfiy kalitlar `.env` / Docker secrets orqali, kodga yozilmaydi
- **Kirish himoyasi**: parol siyosati (minimal murakkablik), 5 marta xato urinishdan keyin vaqtinchalik bloklash (brute-force himoya), yangi qurilmadan kirishda bildirishnoma
- **Sessiya boshqaruvi**: foydalanuvchi o'z aktiv sessiyalarini (qurilmalarini) ko'radi va istalganini uzib qo'yadi; hodim ishdan ketganda ega uni bloklashi bilan **barcha sessiyalari bir zumda bekor bo'ladi** (refresh token Redis'dan o'chiriladi)
- **Fayl yuklash xavfsizligi**: turi/hajmi tekshiriladi (faqat rasm, max hajm), fayl nomi qayta nomlanadi, MinIO'dagi fayllar to'g'ridan-to'g'ri emas — imzolangan (presigned) URL orqali beriladi
- **Audit log o'zgarmas**: yozildi — o'chirilmaydi/tahrirlanmaydi (hech kim, hatto ega ham izini o'chira olmaydi — shaffoflik kafolati)
- **OWASP Top 10** ro'yxati bo'yicha har release tekshiriladi; dependency zaifliklar avtomatik skanerlanadi (npm audit + Dependabot CI'da)
- **Ma'lumotlar himoyasi**: bazada parollar argon2, backup fayllari shifrlanadi, ega ma'lumotlarini istalgan payt to'liq eksport qila oladi (vendor lock-in yo'q)
- DDoS himoya: nginx rate-limit + kerak bo'lsa Cloudflare qatlami
- Ishga tushirishdan oldin xavfsizlik auditi (penetration test) o'tkaziladi
- Egasi uchun ixtiyoriy **2FA** (TOTP) — 2-bosqichda

### Ma'lumotlar yaxlitligi (integrity) — sklad tizimining yuragi

- **Har qoldiq/qarz o'zgarishi DB tranzaksiyasida**: chiqim paytida `SELECT ... FOR UPDATE` bilan qator qulflanadi — ikki operator bir vaqtda oxirgi mahsulotni sotib yuborolmaydi (race condition yo'q), manfiy qoldiq DB constraint bilan taqiqlanadi
- **Idempotency key**: zakaz yaratishda klient noyob kalit yuboradi — internet uzilib qayta bosilsa ham zakaz ikkilanmaydi
- ID'lar — **UUID v7** (tartibli, indeks-do'st; PostgreSQL 17'da native funksiya yo'q — app darajasida `uuidv7` npm bilan generatsiya); barcha vaqtlar UTC'da saqlanadi, UI'da Toshkent vaqtida ko'rsatiladi
- Soft-delete (o'chirilgan yozuv tarixda qoladi), `created_at/updated_at` hamma jadvalda
- Hujjatlar (kirim/chiqim/zakaz) **tasdiqlangach o'zgarmaydi** — tuzatish faqat storno (bekor qilish hujjati) orqali

### Dizayn-tizim va UX (birinchi taassurot sotadi)

Raqobatchilarning (Smartup, 1C) asosiy zaif joyi — eskirgan og'ir interfeys. Bizda dizayn raqobat quroli bo'ladi:

- **Dizayn-tizim boshidan**: Tailwind token'lari (ranglar, radiuslar, spacing, typography) bitta konfiguratsiyada — butun ilova yagona uslubda; **dark mode** boshidan qo'llab-quvvatlanadi
- **shadcn-vue (Reka UI asosida)**: komponentlar kutubxona sifatida emas, kod sifatida loyihaga kiradi — to'liq nazorat, keraksiz og'irlik yo'q, accessibility (a11y) ichida
- **Animatsiyalar ma'no tashiydi** (motion-v): zakaz statusi o'zgarganda karta silliq ko'chadi, savatga qo'shilganda mahsulot "uchib" boradi, raqamlar animatsiya bilan o'sadi (countup), ro'yxatlar stagger bilan ochiladi — lekin tezlikka xalaqit bermaydi (200-300ms, reduced-motion hurmat qilinadi)
- **Skeleton loading** har ro'yxat/kartada — "oq ekran" hech qachon ko'rinmaydi; optimistic update (TanStack Query) — bosilganda darhol javob
- **vue-sonner** toast'lar, buyruq palitrasi (Ctrl+K — tez qidiruv: mahsulot/zakaz/kontragent)
- **Mobile-first**: do'kon operatori va kuryer ekranlari avval telefonga chiziladi (katta tugmalar, pastki navigatsiya, bir qo'l bilan ishlash), sklad/ega ekranlari desktop'ga boy jadval/dashboard bilan
- **ECharts dashboard**: interaktiv grafiklar (zoom, tooltip), sparkline'lar kartalarda
- Ishlab chiqishda UI/UX dizayn skill-vositalari bilan har ekran dizayn-review qilinadi; Storybook'da komponentlar alohida ko'riladi:
  - **Impeccable** (impeccable.style) — 23 ta dizayn buyrug'i (`/impeccable init` bilan PRODUCT.md/DESIGN.md yaratiladi — auditoriya, brend, ranglar, tipografika bir joyda; keyin `polish`, `audit`, `critique`, `animate`, `bolder`, `quieter` buyruqlari bilan har ekran sayqallanadi). Faza 0'da `npx impeccable install` bilan o'rnatiladi, "product" rejimida ishlatiladi (app UI/dashboard uchun)
  - **taste-skill** (github.com/Leonxlnx/taste-skill) — "AI-slop" ga qarshi yuqori dizayn didi: generik AI-naqshlarni (Inter + binafsha gradient + dumaloq kartalar) aniqlab, premium tipografika/spacing/motion standartlarini qo'llaydi; mavjud UI'ni audit qilib buzmasdan yaxshilaydi. O'rnatish: `npx skills add https://github.com/Leonxlnx/taste-skill`
  - **Animatsiya skill'i** (github.com/emilkowalski/skills — "Animations on the Web" kursi muallifi, Vercel/Linear'da ishlagan, sonner/vaul yaratuvchisi) — har animatsiya qarori professional motion-dizayn printsiplari bilan: to'g'ri easing funksiyasi, mos davomiylik, faqat transform/opacity (performance), spring vs tween tanlovi; motion-v bilan yozgan animatsiyalarimiz shu skill nazorati ostida bo'ladi
  - **ui-ux-pro-max**, **frontend-design** — ekran dizayn-review va anti-slop tekshiruvlar uchun
  - Rollar taqsimoti: Impeccable — yagona dizayn tili va buyruqlar; taste-skill — premium did va anti-generik audit; frontend-design — dizayn yo'nalishini tanlash; animatsiya skill'i — har motion qarori. Bir ekranga bittadan ketma-ket qo'llanadi, natija Storybook'da solishtiriladi

### Frontend arxitekturasi

- **Vue Router** (lazy-loaded sahifalar, rol bo'yicha route guard), **TanStack Query (vue-query)** — server ma'lumotlari keshi, avtomatik refetch, optimistic update
- **vue-i18n** (uz-lotin asosiy, ru) — barcha matnlar boshidan tarjima fayllarida
- **PWA offline strategiya** (`apps/shop` va kuryer rejimi uchun kritik): katalog/qoldiqlar IndexedDB'da keshlanadi; internet yo'qda zakaz **outbox-navbatga** yoziladi (IndexedDB) va ulanish qaytganda avtomatik yuboriladi — o'z mexanizmimiz `online` event asosida, chunki **Background Sync API iOS Safari'da yo'q**; Background Sync bor joyda qo'shimcha ishlaydi. Idempotency key dublikatdan saqlaydi
- **Shtrix-kod skaner**: Chrome'da BarcodeDetector API, **iOS Safari'da yo'q — zxing-wasm fallback** (bitta composable ikkalasini yashiradi)
- Rasm optimizatsiya: yuklashda backend (sharp, BullMQ worker) thumbnail'lar yasaydi

### Masshtablash (scalability)

- API **stateless** — sessiya holati Redis'da, shu tufayli nginx orqasida bir nechta API konteyner gorizontal ko'tariladi
- **Socket.IO Redis adapter** — bir nechta API instansiya orasida real-time xabarlar sinxron
- Og'ir ishlar (Excel import, PDF akt, hisobot, rasm) — **BullMQ worker**da, API bloklanmaydi
- Hisobotlar uchun indekslar + kerak bo'lsa materialized view; kelajakda read-replica uchun tayyor

### Hosting va qonunchilik

- **Shaxsiy ma'lumotlar qonuni (O'zR)**: O'zbekiston fuqarolarining shaxsiy ma'lumotlari O'zbekiston hududidagi serverlarda saqlanishi shart — SaaS versiya lokal data-markazda joylashadi (UZCLOUD, ahost.uz va sh.k.), bu mijozlar uchun ham ishonch omili
- Litsenziya/oferta, maxfiylik siyosati hujjatlari MVP'gacha tayyorlanadi
- **O'zimizning landing — murcha.uz bosh sahifasi** (marketing sayti, dasturdan alohida):
  - Tuzilma: hero (Chaqqon maskot + "Savdoga ulgur!" + demo video/skrinshot) → muammo/yechim ("Do'konlaringiz hali ham Telegram'da zakaz beradimi?") → asosiy imkoniyatlar (B2B portal, qarz nazorati, kuryer xaritada — 3 ta killer feature birinchi) → tariflar jadvali → mijoz fikrlari (pilotdan keyin) → FAQ → ro'yxatdan o'tish CTA
  - Alohida sahifalar: /tariflar, /imkoniyatlar (har modul uchun), /blog, qiyoslash sahifalari (Murcha vs MoySklad...), /aloqa
  - Texnik: `apps/landing` — Vue + **vite-ssg (statik generatsiya)**, xuddi shu Tailwind dizayn-tizim — yangi texnologiya o'rganish shart emas, SEO uchun to'liq statik HTML
  - uz/ru ikki tilda, Web Vitals < 2 sek, dizayn skill'lar bilan sayqallanadi (bu yerda Impeccable "brand" rejimi ishlatiladi)

### Kuzatuv va ishonchlilik (observability & ops)

- **Loglar**: pino (JSON structured), request-id har so'rovda — muammoni izlash oson
- **Xatolar**: Sentry (self-hosted GlitchTip varianti ham bor) — frontend + backend xatolari real vaqtda
- **Health check**: `/healthz` (DB, Redis tekshiradi) — Docker restart siyosati + monitoring shunga qaraydi; keyin Uptime Kuma bilan tashqi monitoring
- **Backup**: pg_dump har kecha + haftalik to'liq, MinIO fayllar sinxron, boshqa serverga yuklanadi; **restore protsedurasi hujjatlanadi va sinovdan o'tkaziladi**
- **CI/CD**: GitHub Actions — har push'da lint + testlar, `main`ga merge'da Docker image build → registry → serverga deploy (zero-downtime: yangi konteyner ko'tarilib eski o'chadi)
- Muhitlar: `dev` (lokal Docker) → `staging` → `production` — bir xil compose fayl, faqat env farq qiladi

### Ma'lumotlar bazasi — asosiy jadvallar

> **To'liq sxema — [DATABASE.md](DATABASE.md)**: barcha jadvallar ustunlari bilan, ERD, indekslar, CHECK cheklovlar, RLS siyosati, Prisma kelishuvlari. Faza 0'dagi Prisma sxema shu hujjatdan yoziladi. Quyida qisqa ro'yxat:

*Tashkilot va foydalanuvchilar:* `companies` (logo, brend rangi, vitrina sozlamalari), `users`, `company_members` (user ↔ kompaniya + rol — bir user bir nechta kompaniyada ishlashi shu orqali), `roles` + `permissions` (egasi maxsus rol yarata oladi), `user_assignments` (hodim ↔ sklad/nuqta biriktirish), `audit_logs`.

*Tuzilma:* `warehouses` (skladlar), `sale_points` (sotuv nuqtalari, GPS koordinatasi bilan; qarz hisobi uchun `counterparties`ga bog'lanadi), `counterparties` (postavshchik/mijoz — kredit limiti va to'lov muddati shu yerda).

*Mahsulot:* `products`, `categories`, `product_images`, `product_barcodes`, `product_units` (o'ram konvertatsiyalari), `price_types` + `product_prices` (narx turlari, tarix bilan), `product_variants`, `batches` (partiya/srok), custom maydonlar JSONB.

*Sklad harakati:* `stock` (sklad×mahsulot: qoldiq + **rezerv miqdori** — zakaz tasdiqlanganda rezerv ortadi), `stock_movements` (har harakat: kirim/chiqim/ko'chirish/spisaniye — immutable jurnal), `purchase_orders` + `purchase_order_items` (postavshchik zakazlari).

*Savdo va dostavka:* `orders` + `order_items` (B2B zakazlar, status history), `deliveries` (dostavka: kuryer, marshrut, status) + `courier_locations` (GPS tarixi — **30 kun retention**, eski yozuvlar kunlik job bilan o'chiriladi, aks holda jadval cheksiz o'sadi), `leads` (vitrinadan kelgan zakaz so'rovlari).

*Moliya:* `transactions` (kirim-chiqim), `cash_registers` (kassalar) + `cash_shifts` (kun yopish/smena), `debt_movements` (qarz jurnali: zakaz/to'lov/qaytarish — immutable), `payment_allocations` (to'lov qaysi zakazlarga taqsimlandi), `exchange_rates` (CBU/ichki kurs tarixi).

*Tizim:* `notifications` (bildirishnomalar tarixi), `subscriptions` (kompaniya tarifi va muddati).

Muhim printsip: **qoldiq ham, qarz balansi ham hech qachon qo'lda o'zgartirilmaydi** — faqat `stock_movements` va `debt_movements` yozuvlari orqali hisoblanadi (buxgalteriya printsipi, shaffoflik kafolati).

---

## 8. Ish rejasi (bosqichlar)

Printsip: **har faza kichik (asosan 1 hafta) va aniq natija bilan tugaydi** — "Natija" qatoridagi narsa ishlamaguncha keyingi fazaga o'tilmaydi. Har faza oxirida: testlar o'tadi, `/graphify` yangilanadi, yangi ekranlar dizayn-review qilinadi.

### 8.0. Ish uslubi — AI (Sonnet) bilan yozish

Faza — **milestone**, lekin AI-sessiya uchun ish birligi **vazifa (task)**: bitta sessiya = bitta vazifa = bitta PR (~1–3 soatlik ish, 3–10 fayl). Faza katta bo'lsa ham, Sonnet hech qachon "butun fazani" yozmaydi — faqat navbatdagi vazifani.

- **Har faza boshida** faza `TASKS.md` ga 4–8 vazifaga bo'linadi (plan-rejimda), har vazifada: nima qilinadi, qaysi fayllar, qabul mezoni (test/demo)
- Misol — Faza 2 (katalog) vazifalarga bo'linishi: (1) Prisma product modellari + migratsiya; (2) products backend moduli (repository→service→controller, testlar bilan); (3) kategoriyalar + birliklar backend; (4) rasm yuklash (MinIO + sharp worker); (5) katalog ro'yxat UI; (6) mahsulot forma UI; (7) qidiruv/filter
- **CLAUDE.md Faza 0'da yoziladi** (muhim!): kod konventsiyalari, qatlam qoidalari (controller'dan Prisma chaqirilmaydi...), papka tuzilmasi, "har yangi modul orders modulidan nusxa uslubida" — Sonnet har sessiyada shu qoidalar bilan ishlaydi, kontekstga butun loyihani yuklash shart emas
- Sonnet uchun qulaylik bizning arxitekturaga qurilgan: modullar bir xil qolipda (bitta modulni ko'rsatsangiz — qolganini xuddi shunday yozadi), `packages/shared` sxemalar, testlar qabul mezoni sifatida
- Har vazifadan keyin: testlar o'tishi + qo'lda demo tekshiruv; faza yopilishida faza "Natija" mezoni + `/graphify`
- Murakkab joylar (RLS, qoldiq tranzaksiyalari, qarz jurnali) — plan-rejimda avval yechim kelishiladi, keyin yoziladi; oddiy CRUD/UI — to'g'ridan-to'g'ri

### 8.0.1. Jarayon intizomi (team-lead qoidalari)

- **Git workflow**: himoyalangan `main` + feature branch har vazifaga; merge sharti — CI yashil + `/code-review` o'tgan; Conventional Commits (`feat:`, `fix:`...). Solo + AI loyihada AI-review — yagona "ikkinchi ko'z", majburiy
- **Definition of Done (har vazifa)**: testlar + lint yashil · `/code-review` o'tdi · qo'lda demo qilindi · CHECKLIST/TASKS yangilandi. To'rtta shart bajarilmaguncha vazifa yopilmaydi
- **Velocity nazorati**: Faza 2 tugagach plan/fakt solishtiriladi, qolgan fazalar qayta baholanadi (birinchi ikki faza — o'lchagich; optimizmga jarima shu yerda beriladi)
- **Scope muzlatilgan**: MVP tarkibi shu hujjat bilan qotdi. Har yangi g'oya — `BACKLOG.md`ga, MVP'ga emas. Istisno faqat pilot mijoz blokeri
- **Pilot mijozlar erta jalb qilinadi**: Faza 5 natijasi (zakaz oqimi demo) bilan 2–3 biznesga ko'rsatiladi, kelishuv Faza 8'gacha — Faza 12'da ular kutmasdan boshlaydi; haftada bitta demo-video odat qilinadi
- **Texnik qarz sloti**: har faza oxirida yarim kun — refactor + `/simplify`; "keyin tuzatamiz" ro'yxati shu yerda nolga tushadi
- **Migratsiya qoidasi**: expand-contract — avval qo'shiladi (yangi ustun/jadval), kod o'tkaziladi, keyingi release'da eskisi o'chiriladi; buziladigan migratsiya zero-downtime deploy'ni bekor qiladi
- **Haftalik retro (o'ziga)**: 15 daqiqa — nima bitdi, nima sekin ketdi, keyingi hafta rejasi; PROGRESS.md ga 3-4 qator

### Faza 0 — Skelet va infratuzilma (1 hafta)
- Monorepo (pnpm, JavaScript ES modules, ESLint, Prettier, JSDoc)
- **CLAUDE.md**: kod konventsiyalari, qatlam qoidalari, modul qolipi, git workflow (8.0.1) — keyingi barcha AI-sessiyalar uchun asos
- Repo intizomi: himoyalangan `main`, `BACKLOG.md` + `PROGRESS.md` yaratiladi
- Docker Compose: postgres, redis, minio, api, worker (BullMQ), web, nginx
- Prisma sxema (7-bo'limdagi jadvallar), birinchi migratsiya, seed data, RLS siyosatlari
- CI (GitHub Actions): lint + test har push'da; pino log, health check, Sentry
- Dizayn skill'lar o'rnatiladi: `npx impeccable install` + `/impeccable init` (PRODUCT.md/DESIGN.md), taste-skill (`npx skills add`), emilkowalski animatsiya skill'i, Graphify
- **Natija**: `docker compose up` → bo'sh ilova ochiladi, API `/healthz` javob beradi, CI yashil

### Faza 1 — Auth va kompaniya (1 hafta)
- Ro'yxatdan o'tish (telefon + kompaniya), login, JWT + refresh rotation
- RBAC middleware, tayyor rollar, `company_members` (bir user — bir nechta kompaniya)
- Kirish himoyasi: rate-limit, brute-force bloklash, sessiyalar ro'yxati/uzish
- Auth bitta API'da — keyinchalik `apps/web` ham, `apps/shop` ham shu auth'dan foydalanadi (rol qaysi ilovaga kirishni belgilaydi)
- Subdomain auth qarori shu fazada: refresh token — httpOnly cookie (`domain=.murcha.uz`), access token — Authorization header; CORS oq ro'yxat app./shop. uchun
- **Natija**: kompaniya ochib, kirib-chiqib bo'ladi; ikkinchi kompaniya ma'lumoti ko'rinmaydi (RLS testi)

### Faza 2 — Mahsulot katalogi (1–2 hafta)
- Mahsulot CRUD: identifikatsiya, rasmlar (MinIO + sharp thumbnail), kategoriyalar daraxti
- O'lchov birliklari + o'ram konvertatsiyasi, narx turlari + narx tarixi, variantlar, custom maydonlar
- Skladlar CRUD, katalog qidiruv/filter (full-text)
- **Natija**: 100 ta mahsulotli katalog rasmlari bilan telefonda tez ochiladi

### Faza 3 — Sklad operatsiyalari (1–2 hafta)
- Kirim / chiqim / spisaniye / skladlararo ko'chirish hujjatlari (tasdiqlash + storno printsipi)
- `stock_movements` jurnali, qoldiq + rezerv hisobi (tranzaksiya + qator qulfi), manfiy qoldiq taqiqi
- Boshlang'ich qoldiq kirimi, o'rtacha tannarx, minimal qoldiq ogohlantirishi
- Postavshchik zakazi (purchase order) → kirim shu asosda
- **Natija**: invariant test o'tadi (movements yig'indisi = qoldiq); ikki parallel chiqim race-condition testi o'tadi

### Faza 4 — Shtrix-kod, Excel, inventarizatsiya (1 hafta)
- Shtrix-kod skaner (PWA kamera + USB), yorliq chop etish (etiketka)
- Excel import/export (mahsulot, qoldiq, kontragent) — BullMQ worker'da
- Inventarizatsiya: sanoq rejimi → farqlar → tasdiqlash → avtomatik tuzatish hujjatlari
- **Natija**: telefon kamerasi bilan mahsulot topiladi; 1000 qatorli Excel import qilinadi

### Faza 5 — B2B zakaz portali (2 hafta) ← killer feature
- Sotuv nuqtalari boshqaruvi (counterparty bog'lanishi, narx turi biriktirish)
- **`apps/shop` — do'kon PWA skeleti** (alohida ilova, `packages/ui` umumiy komponentlar bilan): katalog (o'z narxlari) → savat → zakaz (idempotency key, rezerv) — telefonga o'rnatiladi
- Sklad tomoni (`apps/web`): zakaz navbati, tasdiqlash (limit tekshiruvisiz — hozircha), pick list, statuslar oqimi
- Qisman yetkazish/backorder, zakazni bekor qilish (storno)
- **Natija**: do'kon operatori shop.murcha.uz'ni telefoniga o'rnatib zakaz beradi; E2E test — "do'kon zakaz berdi → sklad yig'di" to'liq o'tadi

### Faza 6 — Hodimlar va bildirishnomalar (1 hafta)
- Hodimlar boshqaruvi UI: yaratish, rol/maxsus rol, sklad-nuqtaga biriktirish, bloklash
- SMS (Eskiz.uz) — hodim/do'kon taklifi (tegishli ilova linki bilan); Socket.IO real-time + Web Push — ikkala ilovada (`apps/web` va `apps/shop`)
- Parolni tiklash: ega hodim parolini tiklaydi (hodimlar UI'dan) + o'z-o'zini tiklash "parolni unutdim" — telefon + SMS kod (OTP: 6 raqam, 3 daqiqa muddat, urinish limiti); tiklangach barcha aktiv sessiyalar bekor qilinadi
- Hodim statistikasi (kim qancha yig'di/sotdi)
- **Natija**: yangi hodim SMS'dagi link bilan kiradi; yangi zakaz kelganda sklad telefoni "ding" etadi (ilova yopiq bo'lsa ham)

### Faza 7 — Dostavka va kuryer xaritada (1–2 hafta)
- Zakazni kuryerga biriktirish, kuryer PWA ekrani (ro'yxat, summa)
- GPS uzatish (Geolocation + Socket.IO), jonli xarita (Leaflet) — ega/dispetcher va do'kon ko'radi
- Qabul qilish + farqlar akti, yetkazish tasdig'i (kod/imzo), qaytarish (vozvrat) — do'kon tomoni `apps/shop`da
- **Natija**: kuryer telefoni bilan yurganda nuqtasi xaritada jonli siljiydi; do'kon o'z PWA'sida farq belgilab qabul qiladi

### Faza 8 — Qarz (nasiya) boshqaruvi (2 hafta)
- `debt_movements` jurnali, kredit limiti (zakaz tasdiqlashda tekshiruv — Faza 5'ga ulanadi), to'lov muddatlari
- To'lovlar + taqsimlash (FIFO/qo'lda), qisman to'lovlar, aging report
- Solishtirish dalolatnomasi (PDF), realizatsiya (konsignatsiya) rejimi, avtomatik eslatmalar
- Do'kon o'z PWA'sida (`apps/shop`) qarz balansi, to'lov tarixi va muddatlarini ko'radi
- **Natija**: nasiya oqimi testi o'tadi — zakaz → qisman to'lov → aging to'g'ri → limit oshganda blok

### Faza 9 — Kassa, valyuta, chop etish (1–2 hafta)
- Kassa/hisob raqamlar, tranzaksiyalar, xarajat kategoriyalari, zakaz↔to'lov bog'lanishi
- Kun yopish (smena) + kuryer inkassatsiyasi
- Valyuta: USD narxlar, CBU kursi avtomatik (cbu.uz), valyutali qarz
- Kompaniya brendingi (logo, brend rangi) + chop etish: nakladnaya, aktlar — logo bilan, A4/termoprinter
- **Natija**: kun yopilganda kassa farqi ko'rinadi; nakladnaya kompaniya logosi bilan chiqadi

### Faza 10 — Dashboard va hisobotlar (1 hafta)
- Ega dashboardi: bugungi sotuv, kassa, qarzdorlik, muddati o'tganlar, tugayotgan mahsulotlar (ECharts)
- 5–6 asosiy hisobot: sotuv dinamikasi, foyda/marja, top mahsulotlar, sklad aylanmasi, qarzdorlik reestri
- Audit log UI
- **Natija**: ega ertalab 5 daqiqada butun biznes holatini ko'radi (6.2-stsenariy jonli)

### Faza 11 — Landing, vitrina, super-admin (1–2 hafta)
- O'zimizning landing (murcha.uz): hero, imkoniyatlar, tariflar — vite-ssg, uz/ru, SEO (meta/OG, sitemap, Schema.org)
- Kompaniya vitrinasi: profil + ochiq katalog + zakaz so'rovi (lead) — server-render
- Super-admin panel: kompaniyalar, tarif limitlari, obuna holati
- **Natija**: Google "site:murcha.uz" indekslaydi; vitrinadan kelgan lid egaga tushadi

### Faza 12 — Sayqal va ishga tushirish (1–2 hafta)
- Demo-rejim + onboarding checklist (6.4-oqim interaktiv)
- uz/ru lokalizatsiya to'liq (vue-i18n), PWA offline + Background Sync (ikkala ilova: `apps/web` va `apps/shop`)
- Prod: nginx + SSL (Let's Encrypt), CD (zero-downtime deploy), backup + restore sinovi, Uptime Kuma
- Xavfsizlik auditi (OWASP ro'yxati, penetration test)
- **2–3 real biznes bilan pilot (2 hafta parallel)**
- **Natija**: haqiqiy distribyutor real zakazlarini Murcha orqali o'tkazyapti

**Jami: ~14–18 hafta.** Fazalar ketma-ket, lekin 11–12 ni oldingilarga parallel boshlash mumkin.

### Keyingi bosqich (MVP'dan keyin, alohida rejalashtiriladi)
- ЭСФ (didox API), Payme/Click, POS rejim, Telegram-bot, to'liq budjetlash, marshrut optimallashtirish, ishlab chiqarish, markirovka, marketplace rejimi

---

## 9. Verifikatsiya

- Har faza oxirida: `docker compose up` → butun tizim lokalda ko'tariladi, brauzerda tekshiriladi
- API: Vitest + Supertest (asosiy oqimlar: kirim→qoldiq→zakaz→chiqim→qarzdorlik)
- E2E: Playwright bilan asosiy stsenariy **ikki ilova kesib o'tiladi** — do'kon `apps/shop`da zakaz berdi → sklad `apps/web`da yig'di → do'kon qabul qildi → qarzdorlik hisoblandi
- Qoldiq to'g'riligi: har testda `stock_movements` yig'indisi = `stock` qoldig'i (invariant test)
- Qarz to'g'riligi: `debt_movements` yig'indisi = kontragent balansi; nasiya oqimi testi — "nasiyaga zakaz → qisman to'lov → aging report'da to'g'ri ko'rinishi → limit oshganda zakaz bloklanishi"
- Har faza oxirida: `/graphify` (arxitektura grafi — qatlam buzilishlari tekshiriladi) + yangi ekranlar dizayn skill'lar bilan review qilinadi
- Pilot: 1 distribyutor + 2 do'kon real ma'lumot bilan 2 hafta ishlatadi

## 10. Muvaffaqiyat mezonlari
- Do'kon 3 daqiqada zakaz bera oladi (telefonga o'rnatilgan shop.murcha.uz PWA orqali)
- Egasi bitta dashboardda: qoldiqlar, pul, qarzdorlik — real vaqtda
- Yangi kompaniya 15 daqiqada ro'yxatdan o'tib ishlay boshlaydi

---

## 11. Brending: nom, logo, maskot

### 11.1. Nom — MURCHA

- **Ma'no**: "murcha" (mo'rcha) — chumolining qadimiy/she'riy nomi. Nom va maskot bir butun: chumoli o'z vaznidan 50 barobar og'ir yuk ko'taradi, mehnatkash, intizomli, jamoada ishlaydi — sklad biznesining o'zi
- Ustunliklari: noyob (dasturiy mahsulotlar orasida yo'q), qisqa (6 harf), tovar belgisi sifatida himoyalash oson, uz/ru talaffuzda qulay ("Мурча")
- Domen: **murcha.uz** (birinchi ish — bandligini tekshirib band qilish; zaxira variantlar: murcha.io, murchaapp.uz, getmurcha.com)
- Slogan: **"Savdoga ulgur!"** — "ulgur" so'zi (ulgurji + ulgurmoq ikki ma'nosi bilan) sloganda saqlanadi; variantlar: "Murcha — kichik jamoa, katta kuch", "Yukingizni Murcha ko'taradi"
- Yozilishi: kichik harflar bilan `murcha` (do'stona, zamonaviy), matnda MURCHA

**Nom/logo tozaligi tekshiruvi (2026-07-07 holatiga):**
- "Murcha" nomli dastur/kompaniya/brend internetda topilmadi (global va O'zbekiston bo'yicha) — nom bo'sh ko'rinadi
- murcha.uz DNS'da mavjud emas — katta ehtimol bo'sh, lekin rasmiy tekshirish shart
- Chumoli-maskot konsepti umumiy (stock rasmlar, Hindistonda "Ant Mascot" B2B kompaniyasi, Xitoyda Ant Group fintech bor) — lekin konsept mualliflik huquqi bilan himoyalanmaydi, faqat aniq chizma himoyalanadi; bizning SVG noldan chizilgan, hech qaysi tayyor rasmdan ko'chirilmagan — buzilish yo'q. Qoida: kelajakda ham stock/boshqa brend chizmasidan nusxa olinmaydi
- Boshqa tillardagi ma'nolar: sanskritcha/hindcha "hushdan ketish", portugalcha "so'lgan" — O'zbekiston bozori uchun ahamiyatsiz, xalqaro kengayishda esda tutiladi

**Qilinishi shart bo'lgan rasmiy qadamlar (kod boshlashdan oldin):**
1. **cctld.uz** orqali murcha.uz bandligini rasmiy tekshirish va darhol band qilish (arzon, yiliga ~$5-10)
2. **IMA (Intellektual mulk agentligi, ima.uz)** bazasida "Murcha" tovar belgisini tekshirish va 9/42-sinflar (dasturiy ta'minot) bo'yicha ariza topshirish — nizolardan yagona haqiqiy himoya
3. Google Play / App Store'da "Murcha" ilovalari yo'qligini tekshirish
4. Ijtimoiy tarmoq handle'larini band qilish: @murcha_uz (Telegram — eng muhimi!), Instagram, YouTube

### 11.2. Logo va maskot

- **Maskot: chumoli "Chaqqon"** — tanlov sababi: chumoli o'z vaznidan 50 barobar og'ir yuk ko'taradi (sklad/yuk tashish!), mehnatkash, intizomli va jamoa bo'lib ishlaydi (biznes jamoasi kabi); do'stona qahramon kichik biznes auditoriyasiga iliq tuyuladi
- Dastlabki konsept chizildi: `branding/murcha-icon.svg` (PWA ikon — qutini boshi uzra ko'tarib ketayotgan kulgichli chumoli + tezlik chiziqlari) va `branding/murcha-logo.svg` (gorizontal: ikon + "murcha" so'z belgisi + slogan)
- Ranglar: **amber/apelsin** (#F59E0B — energiya, tezlik) + to'q jigarrang (#4A2B12 — chumoli/matn) + krem (#FFF8F0 — quti); ilova UI'sida amber — aksent rang bo'ladi (dizayn-tizim tokeniga kiradi)
- Maskot ishlatilishi: onboarding yo'riqnomasi (Chaqqon o'rgatadi), bo'sh holatlar ("hali zakaz yo'q" ekranida), 404 sahifa, yutuq bildirishnomalari ("Bugungi hamma zakazlarga ulgurdingiz!"), Telegram stikerlar (marketing)
- Yakuniy sayqal: Faza 0'da dizayn skill'lar (Impeccable/taste-skill) bilan + kerak bo'lsa professional illyustratorga buyurtma; logo hujjatlarda (nakladnaya) oq-qora variantda ham ishlashi shart

### 11.3. SEO strategiyasi

**Kalit so'zlar (asosiy nishonlar):**
- O'zbekcha: "ombor dasturi", "sklad dasturi", "sklad programma", "tovar hisobi dasturi", "ulgurji savdo dasturi", "do'kon uchun zakaz tizimi", "ombor hisobi programmasi"
- Ruscha: "программа складского учета Узбекистан", "склад программа Ташкент", "учет товаров программа", "программа для оптовой торговли", "B2B заказы для дилеров"
- Brend qidiruvi: "murcha" so'zining o'zi qidiruv so'roviga aylanishi — maqsad (noyob so'z — brend qidiruvda raqobatsiz)

**Texnik SEO:**
- Landing (marketing sayt) va kompaniya vitrinalari — **server-render/statik** (SPA emas), meta/OG teglar, sitemap.xml, robots.txt
- **Schema.org** strukturali ma'lumotlar: SoftwareApplication (dastur), Organization, LocalBusiness + Product (har vitrina uchun — Google'da boy natijalar)
- **hreflang uz/ru** — har sahifaning ikki til varianti
- Core Web Vitals: landing < 2 sek ochilishi (rasm optimizatsiya, minimal JS)
- Har kompaniya vitrinasi (`murcha.uz/nomi`) alohida indeksatsiya — yuzlab vitrina = yuzlab kirish nuqtasi (SEO flywheel)

**Kontent va lokal SEO:**
- Blog (2-bosqichda): "Sklad hisobini qanday yuritish kerak", "Nasiya savdoni nazorat qilish", "Inventarizatsiya qo'llanmasi" — muammo qidirganlar bizni topadi
- Qiyoslash sahifalari: "Murcha vs MoySklad", "Murcha vs Billz" (raqobatchi nomini qidirganlar uchun)
- Kataloglar: Google Business Profile, Yandex Sprav, prom.uz, marketpleys-kataloglar
- Telegram-kanal (O'zbekistonda asosiy kanal!) — yangiliklar, keys-stadi, video-qo'llanmalar
