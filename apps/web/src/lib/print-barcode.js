import JsBarcode from "jsbarcode";

/**
 * Shtrix-kod yorlig'ini yangi oynada ochib, chop etish dialogini ko'rsatadi.
 * @param {string} barcodeValue
 * @param {string} productName
 * @returns {void}
 */
export function printBarcodeLabel(barcodeValue, productName) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, barcodeValue, {
    format: "CODE128",
    displayValue: true,
    fontSize: 14,
    width: 2,
    height: 60,
  });
  const dataUrl = canvas.toDataURL("image/png");

  const printWindow = window.open("", "_blank", "width=400,height=300");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head><title>Yorliq — ${productName}</title></head>
      <body style="text-align:center;font-family:sans-serif;padding:16px;">
        <div style="font-size:14px;margin-bottom:8px;">${productName}</div>
        <img src="${dataUrl}" alt="${barcodeValue}" />
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
