import QRCode from "qrcode";
import { config } from "../config";

export function scanUrl(scanCode: string): string {
  return `${config.publicBaseUrl}/scan/${scanCode}`;
}

/** PNG data URL for the merchant's scan URL. */
export async function qrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { type: "image/png", width: 600, margin: 2, errorCorrectionLevel: "M" });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A self-contained A4 page with the merchant name and QR code, ready to print. */
export function posterHtml(merchantName: string, qr: string, url: string): string {
  const name = escapeHtml(merchantName);
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Resicard poster - ${name}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; color: #1a1a1a; font-family: Helvetica, Arial, sans-serif; }
  .page { width: 210mm; height: 297mm; box-sizing: border-box; padding: 25mm 20mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; margin: 0 auto; }
  .brand { font-size: 14mm; font-weight: 700; letter-spacing: 0.5mm; color: #f97316; }
  .merchant { font-size: 11mm; font-weight: 600; margin-top: 6mm; }
  .qr { width: 120mm; height: 120mm; }
  .instruction { font-size: 8mm; line-height: 1.3; max-width: 160mm; }
  .url { font-size: 4mm; color: #666666; word-break: break-all; }
  @media print { .page { page-break-after: always; } }
</style>
</head>
<body>
<div class="page">
  <div>
    <div class="brand">Resicard</div>
    <div class="merchant">${name}</div>
  </div>
  <img class="qr" src="${qr}" alt="QR code for ${name}">
  <div>
    <p class="instruction">Scan with your Resicard to redeem local offers</p>
    <p class="url">${escapeHtml(url)}</p>
  </div>
</div>
</body>
</html>`;
}
