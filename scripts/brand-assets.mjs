// Every Resicard brand file in client/public/brand, written from one set of
// constants. Run it with `npm run brand:assets`.
//
// The reason this exists rather than a folder of hand-edited SVGs: the mark
// changed twice and the palette once, and each time a lockup or a favicon was
// missed and shipped stale. Colours, geometry and the buoy-once rule live here
// now, so a change is one edit and a re-run.
//
// It writes SVGs only, using nothing but node builtins, so it runs anywhere the
// app runs. The PNG icons are rasterised from these SVGs and committed
// alongside; see docs/BRAND.md for that step.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "client", "public", "brand");

const SEA = "#0F3B47";
const FOAM = "#F2F5F4";
const SAND = "#E6D9BF";
const BUOY = "#E4572E";
const BLACK = "#000000";
const WHITE = "#FFFFFF";

// ---------------------------------------------------------------------------
// The mark
// ---------------------------------------------------------------------------

/**
 * The 18-point scallop. Twelve reads as a cog and twenty-six fills in below
 * about 20px; eighteen holds down to 16.
 */
function scallop(n = 18, r = 30, amp = 2.6) {
  let d = "";
  const steps = n * 2;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const rr = r + (i % 2 === 0 ? amp : -amp);
    d += (i === 0 ? "M" : "L") + (32 + Math.cos(a) * rr).toFixed(2) + " " + (32 + Math.sin(a) * rr).toFixed(2);
  }
  return d + "Z";
}

/** A circle written as path data, so it can join the scallop in one path. */
const circle = (r) =>
  `M${(32 - r).toFixed(2)} 32a${r} ${r} 0 1 0 ${(r * 2).toFixed(2)} 0a${r} ${r} 0 1 0 ${(-r * 2).toFixed(2)} 0Z`;

/**
 * One path, fill-rule evenodd: scallop filled, the ring at 15.5 knocked out so
 * whatever is behind shows through, the disc at 11.5 filled again. The knockout
 * is the point. A white-filled ring would pin the mark to a white page; this one
 * sits on the sand panel, on the card photograph and on the buoy orange itself
 * without a second file.
 */
const SEAL = `${scallop()}${circle(15.5)}${circle(11.5)}`;

/** The scallop tips reach 32.6, so the box is padded by one unit or they clip. */
const MARK_VIEWBOX = "-1 -1 66 66";

function markBody(ink, accent) {
  return (
    `<path fill-rule="evenodd" clip-rule="evenodd" d="${SEAL}" fill="${ink}"/>` +
    `<circle cx="32" cy="32" r="7.5" fill="${accent}"/>`
  );
}

// ---------------------------------------------------------------------------
// The wordmark
// ---------------------------------------------------------------------------
//
// Outlines of "resicard" set in Bricolage Grotesque ExtraBold, exported once and
// kept as path data so the files do not depend on the font being installed. The
// eight glyphs are separated in the source, which is what lets the dot rule
// below find the i.

const WORD = fs.readFileSync(path.join(here, "brand", "wordmark.path"), "utf8").trim();
const GLYPHS = WORD.split(/\s+(?=M)/).filter(Boolean);
const I_INDEX = 3; // r e s [i] c a r d

/** Bounding box of a subpath. Handles the M, L, Q, V, H and Z the export uses. */
function bbox(sub) {
  const toks = sub.match(/[MLQVHZ]|-?[\d.]+/g) ?? [];
  let x = 0, y = 0, cmd = "", buf = [];
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  const hit = (px, py) => {
    minx = Math.min(minx, px); maxx = Math.max(maxx, px);
    miny = Math.min(miny, py); maxy = Math.max(maxy, py);
  };
  for (const t of toks) {
    if (/^[MLQVHZ]$/.test(t)) { cmd = t; buf = []; continue; }
    buf.push(parseFloat(t));
    if (cmd === "M" || cmd === "L") {
      if (buf.length === 2) { [x, y] = buf; hit(x, y); buf = []; }
    } else if (cmd === "Q") {
      if (buf.length === 4) { hit(buf[0], buf[1]); x = buf[2]; y = buf[3]; hit(x, y); buf = []; }
    } else if (cmd === "V") { y = buf[0]; hit(x, y); buf = []; }
    else if (cmd === "H") { x = buf[0]; hit(x, y); buf = []; }
  }
  return { minx, maxx, miny, maxy };
}

// The i is drawn as two subpaths, the stem and the tittle. For the dotted state
// the tittle is removed from the letterform and an orange disc drawn in its
// place, rather than an orange disc laid over the top of it. Overlaying leaves a
// dark crescent wherever the two do not agree, and they stop agreeing the moment
// anything is scaled.
const I_SUBPATHS = GLYPHS[I_INDEX].split(/(?=M)/).filter(Boolean);
const TITTLE = bbox(I_SUBPATHS[1]);
const DOT = {
  cx: (TITTLE.minx + TITTLE.maxx) / 2,
  cy: (TITTLE.miny + TITTLE.maxy) / 2,
  // Slightly wider than the tittle it replaces. The dot is the whole design in
  // this state, so it is meant to be seen, not to be a faithful copy.
  r: Math.max(TITTLE.maxx - TITTLE.minx, TITTLE.maxy - TITTLE.miny) / 2 + 1.2,
};

const WORD_PLAIN = WORD;
const WORD_UNDOTTED = GLYPHS.map((g, n) => (n === I_INDEX ? I_SUBPATHS[0] : g)).join(" ");
const WORD_TX = "translate(6,81.4)";

function wordBody(ink, dotted, tx = WORD_TX) {
  if (!dotted) return `<path transform="${tx}" fill="${ink}" d="${WORD_PLAIN}"/>`;
  return (
    `<path transform="${tx}" fill="${ink}" d="${WORD_UNDOTTED}"/>` +
    `<g transform="${tx}"><circle cx="${DOT.cx.toFixed(2)}" cy="${DOT.cy.toFixed(2)}" r="${DOT.r.toFixed(2)}" fill="${BUOY}"/></g>`
  );
}

const svg = (w, h, vb, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" role="img" aria-label="Resicard">${inner}</svg>`;

const ground = (w, h, fill, rx) =>
  fill ? `<rect width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ""} fill="${fill}"/>` : "";

// ---------------------------------------------------------------------------
// The banded mark
// ---------------------------------------------------------------------------
//
// The seal with the word struck across it on a band, the way a rubber stamp
// carries its word. It exists because the plain seal says nothing: every
// application needed the wordmark bolted on beside it, and above about 72px
// there is room for the mark to say its own name.
//
// This is a second STATE of one mark, not a second mark. Below the minimum size
// the band drops and what is left is the plain seal, unchanged. The tile test
// is what sets that line: banded holds as a shape to about 56px and is a grey
// lozenge under it, while the plain seal is still itself at 24.
//
// The buoy moves to the dot on the i. It has to: the band crosses the centre,
// which is where the buoy lives, and without it the mark goes flat one-colour.
// That needs no new rule — it is the buoy-once rule already, since the word is
// present, so the accent goes on the i rather than in the seal.

/** Minimum width in px for the banded mark. Below this, use the plain seal. */
const BANDED_MIN_PX = 72;

const BAND = { w: 72, h: 16, rot: -13, rx: 2.5, stroke: 1.6, wordHeight: 8.6 };
const BAND_X = 32 - BAND.w / 2;
const BAND_Y = 32 - BAND.h / 2;
/** The band overhangs the 64 grid, so the banded mark needs a wider box. */
const BANDED_VIEWBOX = "-6 -6 76 76";

const WORD_MIDX = 6.2 + 385.7 / 2;
const WORD_MIDY = (-75.4 + 1.4) / 2;

/** The wordmark centred on (cx, cy) at a given visual height. */
function wordCentred(cx, cy, height, ink, dotted) {
  const s = height / 76.8;
  const tx = cx - WORD_MIDX * s;
  const ty = cy - WORD_MIDY * s;
  const body = dotted
    ? `<path d="${WORD_UNDOTTED}" fill="${ink}"/><circle cx="${DOT.cx.toFixed(2)}" cy="${DOT.cy.toFixed(
        2,
      )}" r="${DOT.r.toFixed(2)}" fill="${BUOY}"/>`
    : `<path d="${WORD_PLAIN}" fill="${ink}"/>`;
  return `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})">${body}</g>`;
}

let maskSeq = 0;

/**
 * `plate` fills the band with a colour instead of knocking it through. Use it
 * over a photograph, where a knockout would put grass behind the letters; leave
 * it null everywhere else so one file sits on any ground.
 */
function bandedBody(ink, { dotted = true, plate = null } = {}) {
  const id = `band${++maskSeq}`;
  const rect = (fill, extra = "") =>
    `<rect x="${BAND_X}" y="${BAND_Y}" width="${BAND.w}" height="${BAND.h}" rx="${BAND.rx}" fill="${fill}"${extra}/>`;
  // A mask rather than an evenodd path: the band crosses the knocked-out ring,
  // and evenodd would fill that crossing back in as two ink slabs.
  const mask =
    `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-6" y="-6" width="76" height="76">` +
    `<rect x="-6" y="-6" width="76" height="76" fill="#fff"/>` +
    `<g transform="rotate(${BAND.rot} 32 32)">${rect("#000")}</g>` +
    `</mask></defs>`;
  return (
    mask +
    `<g mask="url(#${id})"><path fill-rule="evenodd" clip-rule="evenodd" d="${SEAL}" fill="${ink}"/></g>` +
    `<g transform="rotate(${BAND.rot} 32 32)">` +
    (plate ? rect(plate) : "") +
    rect("none", ` stroke="${ink}" stroke-width="${BAND.stroke}"`) +
    wordCentred(32, 32, BAND.wordHeight, ink, dotted) +
    `</g>`
  );
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const files = {};

// Marks. 512 rather than 64 so anything placing them gets a clean upscale.
files["mark-sea.svg"] = svg(512, 512, MARK_VIEWBOX, markBody(SEA, BUOY));
files["mark-white.svg"] = svg(512, 512, MARK_VIEWBOX, markBody(FOAM, BUOY));
files["mark-on-sea.svg"] = svg(512, 512, "0 0 64 64", ground(64, 64, SEA) + markBody(FOAM, BUOY));
files["mark-on-sand.svg"] = svg(512, 512, "0 0 64 64", ground(64, 64, SAND) + markBody(SEA, BUOY));
// One colour, for a photocopier: the buoy becomes the ink, so the centre still
// reads as a dot rather than dropping out.
files["mark-mono-black.svg"] = svg(512, 512, MARK_VIEWBOX, markBody(BLACK, BLACK));
files["mark-mono-white.svg"] = svg(512, 512, MARK_VIEWBOX, markBody(WHITE, WHITE));

// The banded mark. Knockout first: the band takes whatever is behind it, so one
// file sits on the sand panel, on sea and on white.
files["mark-banded-sea.svg"] = svg(512, 512, BANDED_VIEWBOX, bandedBody(SEA));
files["mark-banded-white.svg"] = svg(512, 512, BANDED_VIEWBOX, bandedBody(FOAM));
// One colour, for a photocopier: the dot becomes the ink like everything else.
files["mark-banded-mono-black.svg"] = svg(512, 512, BANDED_VIEWBOX, bandedBody(BLACK, { dotted: false }));
files["mark-banded-mono-white.svg"] = svg(512, 512, BANDED_VIEWBOX, bandedBody(WHITE, { dotted: false }));
// Plated: the band filled, for a photograph or any ground the word would get
// lost in. The membership card is the case this exists for.
files["mark-banded-on-sea.svg"] = svg(512, 512, BANDED_VIEWBOX, bandedBody(FOAM, { plate: SEA }));
files["mark-banded-on-sand.svg"] = svg(512, 512, BANDED_VIEWBOX, bandedBody(SEA, { plate: SAND }));
files["mark-banded-on-buoy.svg"] = svg(512, 512, BANDED_VIEWBOX, bandedBody(FOAM, { dotted: false, plate: BUOY }));

// Wordmarks. Plain is the one that goes beside the seal; dotted is the one that
// stands alone. See the buoy-once rule below.
files["wordmark-sea.svg"] = svg(404, 89, "0 0 404 89", wordBody(SEA, false));
files["wordmark-white.svg"] = svg(404, 89, "0 0 404 89", wordBody(WHITE, false));
files["wordmark-black.svg"] = svg(404, 89, "0 0 404 89", wordBody(BLACK, false));
files["wordmark-dotted-sea.svg"] = svg(404, 89, "0 0 404 89", wordBody(SEA, true));
files["wordmark-dotted-white.svg"] = svg(404, 89, "0 0 404 89", wordBody(WHITE, true));
files["wordmark-dotted-black.svg"] = svg(404, 89, "0 0 404 89", wordBody(BLACK, true));

// Lockups. The buoy appears exactly once: the seal is present here, so it holds
// the accent and the wordmark beside it is plain.
const H = { w: 517, h: 103, mark: "translate(6,6.0) scale(1.421875)", word: "translate(119,88.5)" };
const V = { w: 440, h: 320, mark: "translate(135.5,24) scale(2.640625)", word: "translate(24.05,294.8)" };

function lockup(layout, ink, accent, bg) {
  const inner =
    ground(layout.w, layout.h, bg) +
    `<g transform="${layout.mark}">${markBody(ink, accent)}</g>` +
    wordBody(ink, false, layout.word);
  return svg(layout.w, layout.h, `0 0 ${layout.w} ${layout.h}`, inner);
}

files["lockup-sea.svg"] = lockup(H, SEA, BUOY, null);
files["lockup-white.svg"] = lockup(H, FOAM, BUOY, null);
files["lockup-on-sea.svg"] = lockup(H, FOAM, BUOY, SEA);
files["lockup-on-buoy.svg"] = lockup(H, FOAM, FOAM, BUOY);
files["lockup-on-sand.svg"] = lockup(H, SEA, BUOY, SAND);
files["lockup-mono-black.svg"] = lockup(H, BLACK, BLACK, null);
files["lockup-stacked-sea.svg"] = lockup(V, SEA, BUOY, null);
files["lockup-stacked-white.svg"] = lockup(V, FOAM, BUOY, null);
files["lockup-stacked-on-sea.svg"] = lockup(V, FOAM, BUOY, SEA);

// Icons.
//
// The home screen tile is sand, not sea. It is the one surface where the app is
// competing with every other icon on the phone rather than sitting inside its own
// interface, and a dark tile disappears into a row of dark tiles. Sand is warm,
// light and uncommon in an app grid, and the seal in sea on sand is 8.5:1, so it
// holds at the size a phone actually renders it.
//
// The mark occupies 78% of the tile. Tested at 62, 78 and 88 per cent in a row
// of real neighbouring icons: 62 left the seal marooned in the middle of the
// tile, and 88 pushed the scallop tips into the rounded corner, which iOS then
// masks with a radius of its own choosing. 78 is as much as can be given away
// while the shape still reads as a stamp rather than a texture.
const ICON_INSET = 0.11;
function icon(size, bg, ink, coverage) {
  const inset = (1 - coverage) / 2;
  const scale = coverage * (64 / 66);
  const t = `translate(${(size * inset).toFixed(2)} ${(size * inset).toFixed(2)}) scale(${((size * scale) / 64).toFixed(6)})`;
  return svg(size, size, `0 0 ${size} ${size}`, ground(size, size, bg) + `<g transform="${t}">${markBody(ink, BUOY)}</g>`);
}

/**
 * Whether the home screen tile carries the banded mark or the plain seal.
 *
 * This is on trial. The banded mark drawn at large size and shrunk is a smudge
 * at 56px, but redrawn FOR the tile — shorter band, word about a third bigger,
 * inner ring dropped so the band has less to fight — it holds at 56 and 40 and
 * says the name, which the plain seal never does. What it costs is the 29px
 * iOS settings list and anything smaller, where it goes to a lozenge.
 *
 * Flip this to false to go back to the plain seal. Nothing else needs changing:
 * the favicons and the maskable are plain either way.
 */
const BANDED_APP_ICON = true;

/** The band, drawn for a tile rather than for a poster. See BANDED_APP_ICON. */
const TILE_BAND = { w: 66, wordHeight: 11, rot: -13, rx: 2.5 };

function bandedIconBody(ink) {
  const id = "tileband";
  const bh = TILE_BAND.wordHeight + 6;
  const bx = 32 - TILE_BAND.w / 2;
  const by = 32 - bh / 2;
  const rect = (fill) =>
    `<rect x="${bx}" y="${by}" width="${TILE_BAND.w}" height="${bh}" rx="${TILE_BAND.rx}" fill="${fill}"/>`;
  // A solid scallop, not the ringed seal: at tile size the ring and the band are
  // two competing horizontals and the mark turns to mush. Dropping the ring is
  // what buys the word its legibility.
  return (
    `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-6" y="-6" width="76" height="76">` +
    `<rect x="-6" y="-6" width="76" height="76" fill="#fff"/>` +
    `<g transform="rotate(${TILE_BAND.rot} 32 32)">${rect("#000")}</g></mask></defs>` +
    `<g mask="url(#${id})"><path d="${scallop()}" fill="${ink}"/></g>` +
    `<g transform="rotate(${TILE_BAND.rot} 32 32)">${wordCentred(32, 32, TILE_BAND.wordHeight, ink, true)}</g>`
  );
}

/** Like `icon`, but the artwork box is the wider one the band needs. */
function bandedIcon(size, bg, ink, coverage) {
  const inset = (1 - coverage) / 2;
  const scale = (size * coverage) / 76;
  const t = `translate(${(size * inset + 6 * scale).toFixed(2)} ${(size * inset + 6 * scale).toFixed(2)}) scale(${scale.toFixed(6)})`;
  return svg(size, size, `0 0 ${size} ${size}`, ground(size, size, bg) + `<g transform="${t}">${bandedIconBody(ink)}</g>`);
}

files["app-icon.svg"] = BANDED_APP_ICON
  ? bandedIcon(512, SAND, SEA, 1 - ICON_INSET * 2)
  : icon(512, SAND, SEA, 1 - ICON_INSET * 2);

// Always the plain seal, whatever the tile is doing.
//
// The maskable, because Android crops it to a circle and a circle through the
// banded mark cuts both ends off the band. The small favicon, because 32px is
// below anything the band survives. The SVG favicon, because a browser tab is
// rendered at 16.
files["icon-maskable.svg"] = icon(512, SAND, SEA, 0.6);
files["favicon-tile.svg"] = icon(512, SAND, SEA, 1 - ICON_INSET * 2);
files["favicon.svg"] = svg(64, 64, MARK_VIEWBOX, markBody(SEA, BUOY));

for (const [name, body] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), body + "\n");
}
console.log(`brand: wrote ${Object.keys(files).length} files to client/public/brand`);
console.log(`brand: banded mark minimum ${BANDED_MIN_PX}px, plain seal below that`);
console.log(`brand: dot at ${DOT.cx.toFixed(1)},${DOT.cy.toFixed(1)} r${DOT.r.toFixed(1)}`);
