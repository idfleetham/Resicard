/**
 * Artwork for the demo seed, generated in code rather than checked in.
 *
 * Nothing here is a photograph and nothing depicts a real place: every offer
 * image is an abstract composition in the Coast palette and every outlet logo is
 * a monogram on a brand ground. That is deliberate. The seeded outlets are
 * invented, so a real photograph of a real bar attached to an invented name
 * would misrepresent a business that never agreed to any of it.
 *
 * Everything is an SVG (or, for set menus, a small real PDF) returned as a data
 * URL, so the seed stays a few kilobytes a row and there are no binaries in the
 * repository. Each image is well under 3 KB.
 */

// The Coast palette, as used by client/src/index.css.
const SEA = "#0F3B47";
const SEA_DEEP = "#0A2A33";
const FOAM = "#F2F5F4";
const SAND = "#E6D9BF";
const BUOY = "#E4572E";
const SLATE = "#5C6F75";

/** The display face is not available inside an <img>-loaded SVG, so a websafe stack carries it. */
const DISPLAY_STACK = "Bricolage Grotesque,Trebuchet MS,Verdana,Geneva,sans-serif";

// Deterministic randomness ------------------------------------------------------

/** FNV-1a, so the same offer draws the same picture on every run. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A small deterministic generator seeded from a string. */
function rng(key: string): () => number {
  let state = hash(key) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

// Colourways --------------------------------------------------------------------

interface Way {
  /** Ground. */
  bg: string;
  /** The two structural bands. */
  band: string;
  band2: string;
  /** The single warm or bright note. */
  accent: string;
  /** Hairlines drawn over everything. */
  line: string;
}

/**
 * Five grounds, each with its own bands. No ground is foam: a foam card on a
 * foam page reads as a card whose image failed to load, which is the very thing
 * this artwork exists to fix.
 */
const WAYS: Way[] = [
  { bg: SEA_DEEP, band: SEA, band2: SLATE, accent: SAND, line: "rgba(242,245,244,0.22)" },
  { bg: SEA, band: SEA_DEEP, band2: SLATE, accent: BUOY, line: "rgba(242,245,244,0.20)" },
  { bg: SAND, band: SEA, band2: SLATE, accent: BUOY, line: "rgba(15,59,71,0.20)" },
  { bg: SAND, band: SLATE, band2: SEA_DEEP, accent: SEA, line: "rgba(15,59,71,0.16)" },
  { bg: SLATE, band: SEA_DEEP, band2: SAND, accent: FOAM, line: "rgba(242,245,244,0.20)" },
];

const W = 320;
const H = 180;

const n = (v: number) => Math.round(v * 10) / 10;

function svgUrl(body: string, width: number, height: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `width="${width}" height="${height}" role="presentation">${body}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

// The six compositions ----------------------------------------------------------
//
// One family: flat shapes, a horizon somewhere, one accent, hairlines. None of
// them illustrates what is being sold; they are a ground for the title beneath.

type Draw = (w: Way, r: () => number) => string;

/** A low sun over a banded sea, with the sky ruled like a chart of the tides. */
const horizon: Draw = (w, r) => {
  const skyline = 64 + r() * 20;
  const sunX = 60 + r() * 200;
  const sunR = 20 + r() * 14;
  return [
    `<rect width="${W}" height="${H}" fill="${w.bg}"/>`,
    `<g stroke="${w.line}" stroke-width="2" fill="none" opacity="0.7">`,
    `<path d="M0 ${n(skyline - 44)}h${W}"/><path d="M0 ${n(skyline - 26)}h${W}"/>`,
    `</g>`,
    `<circle cx="${n(sunX)}" cy="${n(skyline - 4)}" r="${n(sunR)}" fill="${w.accent}"/>`,
    `<circle cx="${n(sunX)}" cy="${n(skyline - 4)}" r="${n(sunR + 13)}" fill="none" stroke="${w.line}" stroke-width="2"/>`,
    `<path d="M0 ${n(skyline)}h${W}v${n(H - skyline)}H0z" fill="${w.band}"/>`,
    `<path d="M0 ${n(skyline + 34)}h${W}v${n(H - skyline - 34)}H0z" fill="${w.band2}" opacity="0.55"/>`,
    `<g stroke="${w.line}" stroke-width="2" fill="none">`,
    `<path d="M0 ${n(skyline + 16)}h${W}"/><path d="M0 ${n(skyline + 56)}h${W}"/>`,
    `</g>`,
  ].join("");
};

/** Concentric arcs sweeping out of one corner. */
const arcs: Draw = (w, r) => {
  const left = r() < 0.5;
  const cx = left ? -20 : W + 20;
  const cy = H + 24;
  const step = 30 + r() * 10;
  const rings = [0, 1, 2, 3, 4]
    .map((i) => {
      const rad = 42 + i * step;
      const fill = i % 2 === 0 ? w.band : w.band2;
      return `<circle cx="${cx}" cy="${cy}" r="${n(rad)}" fill="none" stroke="${fill}" stroke-width="${n(12 - i * 1.2)}" opacity="${n(0.85 - i * 0.13)}"/>`;
    })
    .join("");
  return [
    `<rect width="${W}" height="${H}" fill="${w.bg}"/>`,
    `<g>${rings}</g>`,
    `<circle cx="${left ? n(232 + r() * 50) : n(40 + r() * 44)}" cy="${left ? n(44 + r() * 24) : n(86 + r() * 28)}" r="${n(11 + r() * 7)}" fill="${w.accent}"/>`,
    `<path d="M0 ${n(150 + r() * 14)}h${W}" stroke="${w.line}" stroke-width="2"/>`,
  ].join("");
};

/** Three stacked swells. */
const waves: Draw = (w, r) => {
  const band = (y: number, amp: number, fill: string, opacity: number) =>
    `<path d="M0 ${n(y)}C${n(70 + r() * 30)} ${n(y - amp)} ${n(150 + r() * 40)} ${n(y + amp)} ${W} ${n(y - amp / 2)}V${H}H0z" fill="${fill}" opacity="${opacity}"/>`;
  const top = 62 + r() * 22;
  return [
    `<rect width="${W}" height="${H}" fill="${w.bg}"/>`,
    `<circle cx="${n(236 + r() * 50)}" cy="${n(38 + r() * 16)}" r="${n(9 + r() * 6)}" fill="${w.accent}"/>`,
    band(top, 16 + r() * 10, w.band2, 0.5),
    band(top + 30, 14 + r() * 12, w.band, 0.9),
    band(top + 66, 10 + r() * 10, w.band2, 0.85),
    `<path d="M0 ${n(top - 18)}h${W}" stroke="${w.line}" stroke-width="2"/>`,
  ].join("");
};

/** A quay with masts. */
const harbour: Draw = (w, r) => {
  const deck = 118 + r() * 16;
  const posts = [0, 1, 2, 3, 4]
    .map((i) => {
      const x = 28 + i * (46 + r() * 8);
      const h = 26 + r() * 56;
      return `<rect x="${n(x)}" y="${n(deck - h)}" width="7" height="${n(h)}" rx="3.5" fill="${i % 2 ? w.band2 : w.band}"/>`;
    })
    .join("");
  return [
    `<rect width="${W}" height="${H}" fill="${w.bg}"/>`,
    `<g stroke="${w.line}" stroke-width="2" fill="none" opacity="0.7">`,
    `<path d="M0 26h${W}"/><path d="M0 ${n(deck - 12)}h${W}"/>`,
    `</g>`,
    `<circle cx="${n(130 + r() * 140)}" cy="${n(40 + r() * 20)}" r="${n(13 + r() * 8)}" fill="${w.accent}" opacity="0.95"/>`,
    posts,
    `<rect x="0" y="${n(deck)}" width="${W}" height="${n(H - deck)}" fill="${w.band}"/>`,
    `<path d="M0 ${n(deck + 18)}h${W}" stroke="${w.line}" stroke-width="2"/>`,
  ].join("");
};

/** Overlapping dune ridges. */
const dunes: Draw = (w, r) => {
  const ridge = (y: number, tilt: number, fill: string, opacity: number) =>
    `<path d="M0 ${n(y)}L${W} ${n(y - tilt)}V${H}H0z" fill="${fill}" opacity="${opacity}"/>`;
  const base = 54 + r() * 20;
  return [
    `<rect width="${W}" height="${H}" fill="${w.bg}"/>`,
    ridge(base, 22 + r() * 16, w.band2, 0.45),
    ridge(base + 34, -(18 + r() * 16), w.band, 0.95),
    ridge(base + 74, 14 + r() * 14, w.band2, 0.9),
    `<circle cx="${n(210 + r() * 60)}" cy="${n(30 + r() * 12)}" r="${n(10 + r() * 6)}" fill="${w.accent}"/>`,
    `<path d="M0 ${n(base - 16)}h${W}" stroke="${w.line}" stroke-width="2"/>`,
    `<path d="M0 ${n(base - 32)}h${W}" stroke="${w.line}" stroke-width="2" opacity="0.6"/>`,
  ].join("");
};

/** A tide column: bars off a baseline, the tallest in the accent. */
const tide: Draw = (w, r) => {
  const baseline = 132 + r() * 10;
  const count = 9;
  // The first bars stay short: the offer's "20% off" badge sits over that corner.
  const heights = Array.from({ length: count }, (_, i) => (16 + r() * 78) * (i < 2 ? 0.5 : 1));
  const tallest = heights.indexOf(Math.max(...heights));
  const bars = heights
    .map((h, i) => {
      const x = 24 + i * 30;
      return `<rect x="${n(x)}" y="${n(baseline - h)}" width="16" height="${n(h)}" rx="8" fill="${i === tallest ? w.accent : i % 2 ? w.band2 : w.band}"/>`;
    })
    .join("");
  return [
    `<rect width="${W}" height="${H}" fill="${w.bg}"/>`,
    bars,
    `<path d="M0 ${n(baseline)}h${W}" stroke="${w.line}" stroke-width="2"/>`,
    `<path d="M0 ${n(baseline + 20)}h${W}" stroke="${w.line}" stroke-width="2" opacity="0.6"/>`,
  ].join("");
};

const FAMILIES: Draw[] = [horizon, arcs, waves, harbour, dunes, tide];

/**
 * A 16:9 ground for one offer card.
 *
 * The colourway comes from the outlet, so an outlet's offers read as a set, and
 * the composition from the offer, so no two cards in a list repeat. There is no
 * text and nothing representational in the output: the offer title sits under
 * the image and the artwork is a ground, not an illustration of a burger.
 */
export function offerArt(outletSlug: string, offerTitle: string, offerIndex: number): string {
  const way = WAYS[hash(outletSlug) % WAYS.length];
  const key = `${outletSlug}:${offerTitle}:${offerIndex}`;
  // The family steps with the offer index rather than being drawn from the hash,
  // so no outlet can end up with three cards of the same composition in a row.
  const draw = FAMILIES[(hash(outletSlug) + offerIndex) % FAMILIES.length];
  return svgUrl(draw(way, rng(key)), W, H);
}

// Outlet logos ------------------------------------------------------------------

/** Up to two initials: "The Harrow & Herring" gives HH, "Saltgrass Kitchen" SK. */
export function initialsFor(name: string): string {
  const words = name
    .replace(/^The\s+/i, "")
    .split(/[\s&]+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(and|of|the|at|on)$/i.test(w));
  const letters = words.slice(0, 2).map((w) => w[0].toUpperCase());
  return letters.join("") || name.slice(0, 1).toUpperCase();
}

/**
 * Ground and ink pairs, each well past AA at this size. No foam ground: these
 * marks are shown on white lists and on a foam page, and a foam tile on a foam
 * page has no edge at all.
 */
const LOGO_GROUNDS: { bg: string; ink: string; ring: string }[] = [
  { bg: SEA, ink: FOAM, ring: "rgba(242,245,244,0.28)" },
  { bg: SEA_DEEP, ink: SAND, ring: "rgba(230,217,191,0.30)" },
  { bg: SAND, ink: SEA, ring: "rgba(15,59,71,0.22)" },
  { bg: SLATE, ink: FOAM, ring: "rgba(242,245,244,0.28)" },
  { bg: BUOY, ink: FOAM, ring: "rgba(255,255,255,0.32)" },
];

/**
 * A square monogram mark: the outlet's initials over a brand ground, with the
 * same quarter-arc the Resicard mark uses so a wall of logos still reads as one
 * app. The ground varies by outlet; the ink is always the legible one for it.
 */
export function outletLogo(name: string, outletSlug: string): string {
  const g = LOGO_GROUNDS[hash(outletSlug) % LOGO_GROUNDS.length];
  const initials = initialsFor(name);
  const size = initials.length > 1 ? 44 : 56;
  const body = [
    `<rect width="128" height="128" rx="26" fill="${g.bg}"/>`,
    // A faint inner edge, so a sand mark on a sand loyalty card still reads as a tile.
    `<rect x="2" y="2" width="124" height="124" rx="24" fill="none" stroke="${g.ink}" stroke-width="4" opacity="0.16"/>`,
    `<circle cx="10" cy="118" r="42" fill="none" stroke="${g.ring}" stroke-width="8"/>`,
    `<text x="64" y="64" text-anchor="middle" dominant-baseline="central" fill="${g.ink}" ` +
      `font-family="${DISPLAY_STACK}" font-weight="800" font-size="${size}" letter-spacing="-2">${initials}</text>`,
  ].join("");
  return svgUrl(body, 128, 128);
}

// Set-menu PDFs -----------------------------------------------------------------

const escapePdf = (text: string) => text.replace(/([\\()])/g, "\\$1");

/**
 * A real, single-page A4 PDF as a data URL. The offer modal renders the menu as
 * a link, and a link to a string that is not a PDF is worse than no link at all,
 * so this is a genuine (if plain) document rather than a placeholder.
 */
export function menuPdf(outletName: string, heading: string, lines: string[]): string {
  const content: string[] = ["BT", "/F1 22 Tf", "60 760 Td", `(${escapePdf(outletName)}) Tj`, "ET"];
  content.push("BT", "/F2 13 Tf", "60 736 Td", `(${escapePdf(heading)}) Tj`, "ET");
  content.push("0.06 0.23 0.28 RG", "2 w", "60 724 m 535 724 l S");
  let y = 692;
  for (const line of lines) {
    const bold = line.endsWith(":");
    content.push("BT", `/${bold ? "F1" : "F2"} ${bold ? 13 : 11} Tf`, `60 ${y} Td`, `(${escapePdf(line)}) Tj`, "ET");
    y -= bold ? 26 : 19;
  }
  content.push(
    "BT", "/F2 9 Tf", "60 90 Td",
    "(Sample menu for the Resicard demo. Invented outlet, invented dishes, invented prices.) Tj", "ET",
  );
  const stream = content.join("\n");

  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]" +
      "/Resources<</Font<</F1 5 0 R/F2 6 0 R>>>>/Contents 4 0 R>>",
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;

  return `data:application/pdf;base64,${Buffer.from(pdf, "latin1").toString("base64")}`;
}
