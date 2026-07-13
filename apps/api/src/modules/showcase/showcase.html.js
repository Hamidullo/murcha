/**
 * Vitrina sahifasini xom HTML string sifatida quradi — Vue SSR/hydration
 * shart emas (PLAN.md: "server-render", faqat Googlebot uchun to'liq
 * markup kifoya). `debts.pdf.js`dagi bilan bir xil naqsh: sof funksiya,
 * DB'ni bilmaydi, faqat `showcase.service.js`dan kelgan tayyor ma'lumotni
 * render qiladi — to'g'ridan-to'g'ri unit test qilinadi.
 */

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );
}

/**
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
function formatPrice(amount, currency) {
  return `${Number(amount).toLocaleString("ru-RU")} ${currency === "UZS" ? "so'm" : currency}`;
}

/**
 * @param {{
 *   company: { name: string, slug: string, brandColor: string | null, logoUrl: string | null },
 *   catalog: Array<{ id: string, nameUz: string, nameRu: string | null, price: number, currency: string, imageUrl: string | null }>,
 * }} data
 * @param {string} baseUrl — masalan `https://murcha.uz` (kanonik URL/OG uchun)
 * @returns {string}
 */
export function renderShowcaseHtml({ company, catalog }, baseUrl = "") {
  const title = `${escapeHtml(company.name)} — katalog | Murcha`;
  const description = `${escapeHtml(company.name)} kompaniyasining ochiq katalogi — ${catalog.length} mahsulot. Murcha orqali zakaz bering.`;
  const canonicalUrl = `${baseUrl}/${encodeURIComponent(company.slug)}`;
  const brandColor = company.brandColor || "#f59e0b";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    url: canonicalUrl,
    ...(company.logoUrl ? { image: company.logoUrl } : {}),
  };

  const cards = catalog
    .map(
      (item) => `
      <article class="card">
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.nameUz)}" loading="lazy" />` : `<div class="card-noimg"></div>`}
        <h3>${escapeHtml(item.nameUz)}</h3>
        <p class="price">${formatPrice(item.price, item.currency)}</p>
      </article>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonicalUrl}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${canonicalUrl}" />
${company.logoUrl ? `<meta property="og:image" content="${escapeHtml(company.logoUrl)}" />` : ""}
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
<style>
  :root { --brand: ${brandColor}; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; margin: 0; background: #fff8f0; color: #1c1917; }
  header { padding: 24px; background: var(--brand); color: #fff; }
  header h1 { margin: 0; font-size: 1.5rem; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
  .card { background: #fff; border-radius: 12px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  .card img, .card-noimg { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; background: #eee; }
  .card h3 { font-size: 0.95rem; margin: 8px 0 4px; }
  .card .price { font-weight: 700; color: var(--brand); margin: 0; }
  form { max-width: 420px; margin: 32px auto 0; display: grid; gap: 8px; }
  form input, form textarea { padding: 10px; border: 1px solid #ddd; border-radius: 8px; font: inherit; }
  form button { padding: 10px; border: none; border-radius: 8px; background: var(--brand); color: #fff; font-weight: 700; cursor: pointer; }
  #lead-status { min-height: 1.2em; }
</style>
</head>
<body>
<header><h1>${escapeHtml(company.name)}</h1></header>
<main>
  <section class="grid">${cards || "<p>Hozircha mahsulot yo'q.</p>"}</section>
  <section>
    <h2>Zakaz so'rovi qoldiring</h2>
    <form id="lead-form">
      <input name="name" placeholder="Ismingiz" required />
      <input name="phone" placeholder="+998901234567" required />
      <textarea name="message" placeholder="Xabar (ixtiyoriy)"></textarea>
      <button type="submit">Yuborish</button>
    </form>
    <p id="lead-status"></p>
  </section>
</main>
<script>
document.getElementById("lead-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  var form = e.target;
  var status = document.getElementById("lead-status");
  var data = {
    name: form.name.value,
    phone: form.phone.value,
    message: form.message.value || undefined,
  };
  status.textContent = "Yuborilmoqda...";
  try {
    var res = await fetch(window.location.pathname + "/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("failed");
    status.textContent = "Rahmat! Tez orada bog'lanamiz.";
    form.reset();
  } catch (err) {
    status.textContent = "Xatolik yuz berdi, qayta urinib ko'ring.";
  }
});
</script>
</body>
</html>`;
}
