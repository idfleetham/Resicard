import fs from "node:fs";
import path from "node:path";
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

// Brand assets live in client/public/brand in development and are copied to
// dist/public/brand by the build. Try both, relative to this module.
function brandDirs(): string[] {
  const here: string | undefined = import.meta.dirname;
  const dirs = [
    here ? path.resolve(here, "..", "..", "client", "public", "brand") : null,
    here ? path.resolve(here, "public", "brand") : null,
    path.resolve(process.cwd(), "client", "public", "brand"),
    path.resolve(process.cwd(), "dist", "public", "brand"),
  ];
  return dirs.filter((d): d is string => d !== null);
}

const assetCache = new Map<string, string | null>();

/** Read a brand asset once; returns null if it cannot be found so the poster still renders. */
function brandAsset(file: string, encoding: "base64" | "utf8"): string | null {
  const key = `${file}:${encoding}`;
  if (assetCache.has(key)) return assetCache.get(key) ?? null;
  let result: string | null = null;
  for (const dir of brandDirs()) {
    try {
      result = fs.readFileSync(path.join(dir, file)).toString(encoding);
      break;
    } catch {
      // try the next location
    }
  }
  assetCache.set(key, result);
  return result;
}

function photoDataUrl(): string | null {
  const b64 = brandAsset("west-sands.jpg", "base64");
  return b64 ? `data:image/jpeg;base64,${b64}` : null;
}

function lockupSvg(): string {
  const svg = brandAsset("lockup-white.svg", "utf8");
  if (!svg) return "";
  // Size the lockup for the poster; the file's own width/height are the export size.
  return svg.replace(/<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, '<svg$1 width="220" height="44"');
}

const STEPS = [
  "Open Resicard and scan this code.",
  "Choose the offer you want today.",
  "Show the green screen at the till.",
];

/** A self-contained A4 poster (794 x 1123 px at 96 dpi) in the Coast style, ready to print. */
export function posterHtml(merchantName: string, qr: string, url: string): string {
  const name = escapeHtml(merchantName);
  const photo = photoDataUrl();
  const fontUrl = `${config.publicBaseUrl}/fonts/bricolage-grotesque-latin.woff2`;
  // Quoted per month: the poster has one line to make the case, and £3 makes it faster than £36.
  const monthly = config.residentAnnualFeeGbp / 12;
  const fee = Number.isInteger(monthly) ? `£${monthly} a month` : `£${monthly.toFixed(2)} a month`;
  const photoBand = photo
    ? `<img class="photo" src="${photo}" alt="">`
    : "";
  const steps = STEPS.map(
    (text, i) => `<div class="step"><div class="num">${i + 1}</div><div class="step-text">${text}</div></div>`,
  ).join("\n      ");

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Resicard poster - ${name}</title>
<style>
  @font-face {
    font-family: 'Bricolage Grotesque';
    font-style: normal;
    font-weight: 200 800;
    font-display: swap;
    src: url('${fontUrl}') format('woff2');
  }
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #0f3b47; }
  body { font-family: 'Manrope', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif; color: #f2f5f4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .display { font-family: 'Bricolage Grotesque', 'Arial Black', 'Arial', sans-serif; }
  .page { width: 794px; height: 1123px; box-sizing: border-box; background: #0f3b47; color: #f2f5f4; display: flex; flex-direction: column; position: relative; overflow: hidden; margin: 0 auto; }
  .band { position: relative; height: 380px; overflow: hidden; background: #0a2a33; }
  .photo { width: 100%; height: 100%; object-fit: cover; object-position: 50% 45%; display: block; }
  .band-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,59,71,0.05) 0%, rgba(15,59,71,0.2) 60%, #0f3b47 100%); }
  .lockup { position: absolute; left: 56px; top: 44px; line-height: 0; }
  .lockup svg { display: block; }
  .headline-wrap { padding: 0 56px; margin-top: -30px; display: flex; flex-direction: column; gap: 16px; position: relative; }
  .headline { font-weight: 800; font-size: 80px; line-height: 0.95; letter-spacing: -0.04em; text-wrap: pretty; }
  .sub { font-size: 20px; line-height: 1.45; opacity: 0.9; max-width: 600px; }
  .body { padding: 0 56px; margin-top: 44px; display: flex; gap: 40px; align-items: center; position: relative; }
  .qr-panel { width: 280px; height: 280px; background: #ffffff; border-radius: 24px; padding: 22px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
  .qr-panel img { width: 236px; height: 236px; display: block; }
  .steps { display: flex; flex-direction: column; gap: 20px; }
  .step { display: flex; gap: 14px; align-items: center; }
  .num { width: 40px; height: 40px; border-radius: 50%; background: #e4572e; color: #ffffff; display: flex; align-items: center; justify-content: center; font-family: 'Bricolage Grotesque', 'Arial Black', Arial, sans-serif; font-weight: 800; font-size: 18px; flex: 0 0 auto; }
  .step-text { font-size: 18px; line-height: 1.4; }
  .spacer { flex-grow: 1; }
  .foot { margin: 0 56px 48px 56px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(242,245,244,0.3); padding-top: 18px; position: relative; gap: 24px; }
  .foot-label { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.7; font-weight: 700; margin-bottom: 4px; }
  .foot-name { font-weight: 700; font-size: 28px; line-height: 1; letter-spacing: -0.02em; overflow-wrap: anywhere; }
  .foot-right { font-size: 14px; opacity: 0.85; text-align: right; line-height: 1.5; flex: 0 0 auto; }
  .url { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 11px; opacity: 0.6; }
  @media print { .page { page-break-after: always; } }
</style>
</head>
<body>
<div class="page">
  <div class="band">
    ${photoBand}
    <div class="band-shade"></div>
    <div class="lockup">${lockupSvg()}</div>
  </div>

  <div class="headline-wrap">
    <!--
      This poster hangs in a window where visitors and residents both read it.
      "Scan for the local price" announced a two-tier price list to the whole
      street, which puts the outlet in an awkward spot with everyone who is not
      a resident and makes a quiet discount sound like a grievance. The offer is
      the same either way; it just no longer picks a fight on the merchant's
      behalf.
    -->
    <div class="display headline">Live here?<br>Scan here.</div>
    <div class="sub">Open Resicard, scan the code, pick your offer and show the green screen to staff.</div>
  </div>

  <div class="body">
    <div class="qr-panel"><img src="${qr}" alt="QR code for ${name}"></div>
    <div class="steps">
      ${steps}
    </div>
  </div>

  <div class="spacer"></div>

  <div class="foot">
    <div>
      <div class="foot-label">This outlet</div>
      <div class="display foot-name">${name}</div>
      <div class="url">${escapeHtml(url)}</div>
    </div>
    <div class="foot-right">Not a member yet?<br>resicard.co.uk · ${fee}</div>
  </div>
</div>
</body>
</html>`;
}
