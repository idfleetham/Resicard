import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HUMAN_ALPHABET, randomCode } from "./codes";

// Pure helpers for residency postcards: the code, its expiry and the A6 print sheet.
// Nothing here touches the database.

export const POSTCARD_CODE_LENGTH = 6;

/** A fresh 6-character code from the human-readable alphabet (no 0/O/1/I). */
export function newPostcardCode(): string {
  return randomCode(POSTCARD_CODE_LENGTH, HUMAN_ALPHABET);
}

/** Codes are compared case-insensitively and stored only as a sha256 hex digest. */
export function normaliseCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export function hashCode(code: string): string {
  return createHash("sha256").update(normaliseCode(code)).digest("hex");
}

export function attemptsLeft(attempts: number | null | undefined, maxAttempts: number): number {
  return Math.max(0, maxAttempts - (attempts ?? 0));
}

export function isExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function expiryDate(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

/** "12 Main Street\nFlat 2\nSt Andrews\nKY16 9AA" from the users row. */
export function formatAddress(a: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  town?: string | null;
  postcode?: string | null;
}): string {
  return [a.addressLine1, a.addressLine2, a.town, a.postcode]
    .map((line) => (line ?? "").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export function isAddressComplete(a: { addressLine1?: string | null; town?: string | null; postcode?: string | null }): boolean {
  return Boolean(a.addressLine1?.trim() && a.town?.trim() && a.postcode?.trim());
}

/** "07 Sep 2026" */
export function formatLongDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Print sheet
// ---------------------------------------------------------------------------

export interface PrintCard {
  name: string;
  /** Address with newline separators, as stored in the postcard's addressSnapshot. */
  address: string;
  code: string;
  expiresAt: Date | string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Same lookup as the poster in qr.ts: client/public/brand in development, dist/public/brand after a build.
function brandDirs(): string[] {
  const here: string | undefined = import.meta.dirname;
  return [
    here ? path.resolve(here, "..", "..", "client", "public", "brand") : null,
    here ? path.resolve(here, "public", "brand") : null,
    path.resolve(process.cwd(), "client", "public", "brand"),
    path.resolve(process.cwd(), "dist", "public", "brand"),
  ].filter((d): d is string => d !== null);
}

let lockupCache: string | null | undefined;

function lockupSvg(): string {
  if (lockupCache === undefined) {
    lockupCache = null;
    for (const dir of brandDirs()) {
      try {
        lockupCache = fs.readFileSync(path.join(dir, "lockup-white.svg"), "utf8");
        break;
      } catch {
        // try the next location
      }
    }
  }
  if (!lockupCache) return "";
  return lockupCache.replace(/<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, '<svg$1 width="150" height="30"');
}

function cardHtml(card: PrintCard, lockup: string): string {
  const address = card.address
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");
  return `<div class="card">
    <div class="band">${lockup}</div>
    <div class="body">
      <div class="address"><div class="name">${escapeHtml(card.name)}</div>${address}</div>
      <div class="code-block">
        <div class="label">Your Resicard code</div>
        <div class="code">${escapeHtml(card.code)}</div>
        <div class="note">Enter this code in the Resicard app under My card to confirm your address. It expires on ${formatLongDate(card.expiresAt)}.</div>
      </div>
    </div>
  </div>`;
}

/** A4 sheets of four A6 cards (two columns, two rows) with dashed cut lines, ready to print. */
export function printSheetHtml(cards: PrintCard[]): string {
  const lockup = lockupSvg();
  const sheets: string[] = [];
  for (let i = 0; i < cards.length; i += 4) {
    const group = cards.slice(i, i + 4);
    while (group.length < 4) group.push(null as unknown as PrintCard);
    const cells = group.map((c) => (c ? cardHtml(c, lockup) : '<div class="card blank"></div>')).join("\n");
    sheets.push(`<div class="sheet">${cells}</div>`);
  }
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Resicard postcards (${cards.length})</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: 'Manrope', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif; color: #0f3b47; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 210mm; height: 297mm; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm; page-break-after: always; margin: 0 auto; box-sizing: border-box; }
  .card { width: 105mm; height: 148.5mm; box-sizing: border-box; border: 1px dashed #b8c0c2; display: flex; flex-direction: column; overflow: hidden; }
  .card.blank { border-color: transparent; }
  .band { background: #0f3b47; height: 26mm; display: flex; align-items: center; padding: 0 10mm; box-sizing: border-box; }
  .band svg { display: block; }
  .body { flex: 1; padding: 9mm 10mm 8mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
  .address { font-size: 13pt; line-height: 1.45; }
  .name { font-weight: 700; }
  .label { font-size: 9pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #5c6f75; margin-bottom: 2mm; }
  .code { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 34pt; font-weight: 700; letter-spacing: 0.18em; line-height: 1; margin-bottom: 4mm; }
  .note { font-size: 9.5pt; line-height: 1.4; color: #5c6f75; }
  @media screen { body { background: #e6e9e8; padding: 10mm 0; } .sheet { background: #ffffff; margin-bottom: 10mm; } }
</style>
</head>
<body>
${sheets.join("\n")}
</body>
</html>`;
}
