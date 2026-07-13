// `vite-ssg build`dan keyin ishga tushadi (package.json "build" skripti) —
// statik `sitemap.xml`/`robots.txt` yozadi. Route ro'yxati `src/routes.js`dan
// olinadi — yangi sahifa qo'shilganda shu yerga qo'lda qo'shish shart emas.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { routes } from "../src/routes.js";

const BASE_URL = "https://murcha.uz";
const DIST_DIR = fileURLToPath(new URL("../dist", import.meta.url));

const urls = routes
  .filter((route) => route.path !== "*")
  .map((route) => `${BASE_URL}${route.path === "/" ? "" : route.path}`);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

writeFileSync(path.join(DIST_DIR, "sitemap.xml"), sitemap);
writeFileSync(path.join(DIST_DIR, "robots.txt"), robots);
console.log(`sitemap.xml (${urls.length} URL) va robots.txt yozildi.`);
