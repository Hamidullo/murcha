import pdfmakePkg from "pdfmake";

const PdfPrinter = pdfmakePkg.default ?? pdfmakePkg;

/**
 * PDFKit standart 14 shriftidan foydalanadi — `debts.pdf.js`dagi bilan bir
 * xil naqsh (tashqi TTF fayl kerak emas).
 */
const FONTS = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const DOC_TYPE_LABELS = {
  receipt: "Kirim",
  issue: "Chiqim",
  writeoff: "Spisaniye",
  transfer: "Ko'chirish",
};

/**
 * @param {number} amount
 * @returns {string}
 */
function formatAmount(amount) {
  return Number(amount).toLocaleString("ru-RU");
}

/**
 * @param {Date | string | null | undefined} date
 * @returns {string}
 */
function formatDate(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : "—";
}

/**
 * @param {string | null | undefined} logoBase64
 * @param {string} companyName
 * @returns {{ images?: { logo: string }, columns: object[] }}
 */
function buildHeader(logoBase64, companyName) {
  const images = logoBase64 ? { logo: logoBase64 } : undefined;
  const columns = [];
  if (logoBase64) {
    columns.push({ image: "logo", width: 60, margin: [0, 0, 10, 0] });
  }
  columns.push({ text: companyName, style: "header", margin: [0, logoBase64 ? 15 : 0, 0, 0] });
  return { images, columns };
}

/**
 * Nakladnaya (yuk xati) — B2B zakaz uchun. Zakaz `ordered`/`shipped`/
 * `accepted` miqdorlaridan `qtyShipped` (bo'lmasa `qtyOrdered`) ishlatiladi.
 * @param {{
 *   order: { number: string, salePoint: { name: string }, confirmedAt: Date | string | null, currency: string, total: number, items: Array<{ product: { nameUz: string, sku: string }, unit: { short: string }, qtyOrdered: number, qtyShipped: number, price: number, total: number }> },
 *   company: { name: string } | null,
 *   logoBase64?: string | null,
 * }} params
 * @returns {Promise<Buffer>}
 */
export async function renderOrderInvoicePdf({ order, company, logoBase64 }) {
  const { images, columns } = buildHeader(logoBase64, company?.name ?? "");

  const body = [["№", "Mahsulot", "Birlik", "Miqdor", "Narx", "Summa"]];
  order.items.forEach((item, index) => {
    const qty = Number(item.qtyShipped) > 0 ? Number(item.qtyShipped) : Number(item.qtyOrdered);
    body.push([
      String(index + 1),
      `${item.product.nameUz} (${item.product.sku})`,
      item.unit.short,
      String(qty),
      formatAmount(item.price),
      formatAmount(item.total),
    ]);
  });

  const docDefinition = {
    images,
    content: [
      { columns },
      { text: `Nakladnaya № ${order.number}`, style: "title", margin: [0, 10, 0, 0] },
      { text: `Sotuv nuqtasi: ${order.salePoint.name}` },
      { text: `Sana: ${formatDate(order.confirmedAt)}`, margin: [0, 0, 0, 10] },
      {
        table: { headerRows: 1, widths: ["auto", "*", "auto", "auto", "auto", "auto"], body },
        margin: [0, 0, 0, 10],
      },
      { text: `Jami: ${formatAmount(order.total)} ${order.currency}`, bold: true },
      {
        columns: [
          { text: "Topshirdi: ___________________", margin: [0, 40, 0, 0] },
          { text: "Qabul qildi: ___________________", margin: [0, 40, 0, 0] },
        ],
      },
    ],
    styles: {
      header: { fontSize: 14, bold: true },
      title: { fontSize: 13, bold: true, margin: [0, 0, 0, 10] },
    },
    defaultStyle: { font: "Helvetica", fontSize: 10 },
  };

  return renderPdf(docDefinition);
}

/**
 * Kirim/chiqim/spisaniye/ko'chirish akti.
 * @param {{
 *   doc: { type: string, number: string, warehouse: { name: string } | null, toWarehouse: { name: string } | null, counterparty: { name: string } | null, confirmedAt: Date | string | null, currency: string, total: number, reason: string | null, items: Array<{ product: { nameUz: string, sku: string }, unit: { short: string }, qty: number, price: number, total: number }> },
 *   company: { name: string } | null,
 *   logoBase64?: string | null,
 * }} params
 * @returns {Promise<Buffer>}
 */
export async function renderWarehouseDocPdf({ doc, company, logoBase64 }) {
  const { images, columns } = buildHeader(logoBase64, company?.name ?? "");
  const typeLabel = DOC_TYPE_LABELS[doc.type] ?? doc.type;

  const body = [["№", "Mahsulot", "Birlik", "Miqdor", "Narx", "Summa"]];
  doc.items.forEach((item, index) => {
    body.push([
      String(index + 1),
      `${item.product.nameUz} (${item.product.sku})`,
      item.unit.short,
      String(Number(item.qty)),
      formatAmount(item.price),
      formatAmount(item.total),
    ]);
  });

  const infoLines = [{ text: `Sklad: ${doc.warehouse?.name ?? "—"}` }];
  if (doc.type === "transfer") {
    infoLines.push({ text: `Qabul qiluvchi sklad: ${doc.toWarehouse?.name ?? "—"}` });
  }
  if (doc.counterparty) {
    infoLines.push({ text: `Kontragent: ${doc.counterparty.name}` });
  }
  if (doc.type === "writeoff" && doc.reason) {
    infoLines.push({ text: `Sabab: ${doc.reason}` });
  }

  const docDefinition = {
    images,
    content: [
      { columns },
      { text: `${typeLabel} akti № ${doc.number}`, style: "title", margin: [0, 10, 0, 0] },
      ...infoLines,
      { text: `Sana: ${formatDate(doc.confirmedAt)}`, margin: [0, 0, 0, 10] },
      {
        table: { headerRows: 1, widths: ["auto", "*", "auto", "auto", "auto", "auto"], body },
        margin: [0, 0, 0, 10],
      },
      { text: `Jami: ${formatAmount(doc.total)} ${doc.currency}`, bold: true },
      {
        columns: [
          { text: "Topshirdi: ___________________", margin: [0, 40, 0, 0] },
          { text: "Qabul qildi: ___________________", margin: [0, 40, 0, 0] },
        ],
      },
    ],
    styles: {
      header: { fontSize: 14, bold: true },
      title: { fontSize: 13, bold: true, margin: [0, 0, 0, 10] },
    },
    defaultStyle: { font: "Helvetica", fontSize: 10 },
  };

  return renderPdf(docDefinition);
}

/**
 * @param {object} docDefinition
 * @returns {Promise<Buffer>}
 */
function renderPdf(docDefinition) {
  const printer = new PdfPrinter(FONTS);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}
