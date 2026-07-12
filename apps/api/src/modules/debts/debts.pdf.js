import pdfmakePkg from "pdfmake";

const PdfPrinter = pdfmakePkg.default ?? pdfmakePkg;

/**
 * PDFKit standart 14 shriftidan foydalanadi (tashqi TTF fayl kerak emas) —
 * Uzbek lotin matni (apostrof bilan) WinAnsiEncoding doirasida to'liq
 * qo'llab-quvvatlanadi. Logo — Faza 9'ning "chop etish" bandiga tegishli.
 */
const FONTS = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

/**
 * @param {number} amount
 * @returns {string}
 */
function formatAmount(amount) {
  return Number(amount).toLocaleString("ru-RU");
}

/**
 * @param {Date | string} date
 * @returns {string}
 */
function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Kontragent bilan hisob-kitob akti (solishtirish dalolatnomasi) PDF
 * hujjatini generatsiya qiladi — `debts.service.js getStatement()`ning
 * natijasini jadval qilib chiqaradi.
 * @param {{ companyName: string, counterpartyName: string, currency: string, openingBalance: number, closingBalance: number, movements: Array<{ createdAt: Date | string, type: string, orderNumber: string | null, amount: number, balance: number }>, from?: string, to?: string }} statement
 * @returns {Promise<Buffer>}
 */
export async function renderDebtStatementPdf(statement) {
  const typeLabels = {
    order: "Zakaz",
    payment: "To'lov",
    return: "Qaytarish",
    adjustment: "Tuzatish",
    opening: "Boshlang'ich qoldiq",
  };

  const body = [["Sana", "Hujjat", "Kirim", "Chiqim", "Qoldiq"]];
  for (const m of statement.movements) {
    const label = m.orderNumber
      ? `${typeLabels[m.type] ?? m.type} № ${m.orderNumber}`
      : (typeLabels[m.type] ?? m.type);
    body.push([
      formatDate(m.createdAt),
      label,
      m.amount > 0 ? formatAmount(m.amount) : "",
      m.amount < 0 ? formatAmount(-m.amount) : "",
      formatAmount(m.balance),
    ]);
  }

  const docDefinition = {
    content: [
      { text: "Solishtirish dalolatnomasi", style: "header" },
      { text: statement.companyName },
      { text: `Kontragent: ${statement.counterpartyName}` },
      {
        text: `Davr: ${statement.from ?? "—"} — ${statement.to ?? "—"}`,
        margin: [0, 0, 0, 10],
      },
      {
        text: `Boshlang'ich qoldiq: ${formatAmount(statement.openingBalance)} ${statement.currency}`,
      },
      {
        table: { headerRows: 1, widths: ["auto", "*", "auto", "auto", "auto"], body },
        margin: [0, 10, 0, 10],
      },
      {
        text: `Yakuniy qoldiq: ${formatAmount(statement.closingBalance)} ${statement.currency}`,
        bold: true,
      },
      {
        columns: [
          { text: "Yetkazib beruvchi: ___________________", margin: [0, 40, 0, 0] },
          { text: "Xaridor: ___________________", margin: [0, 40, 0, 0] },
        ],
      },
    ],
    styles: { header: { fontSize: 14, bold: true, margin: [0, 0, 0, 10] } },
    defaultStyle: { font: "Helvetica", fontSize: 10 },
  };

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
