/**
 * Artwork for the demo seed, generated in code rather than checked in.
 *
 * Every offer image is a flat cartoon of what the offer is - a pint for a pint,
 * a book for the bookshop - drawn in the Coast palette, and every outlet logo is
 * a monogram on a brand ground. Nothing here is a photograph and nothing depicts
 * a real place. That is deliberate: the seeded outlets are invented, so a real
 * photograph of a real bar attached to an invented name would misrepresent a
 * business that never agreed to any of it. A drawing of a pint misrepresents
 * nobody.
 *
 * Everything is an SVG (or, for set menus, a small real PDF) returned as a data
 * URL, so the seed stays a few kilobytes a row and there are no binaries in the
 * repository. Offer pictures average about 3.5 KB and none exceeds 8 KB.
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
  /** The disc the subject sits on. Always light, so dark ink works on every ground. */
  disc: string;
  /** The subject's own fill, and its one accent. */
  body: string;
  pop: string;
}

/**
 * Five grounds, each with its own bands. No ground is foam: a foam card on a
 * foam page reads as a card whose image failed to load, which is the very thing
 * this artwork exists to fix.
 */
const WAYS: Way[] = [
  { bg: SEA_DEEP, band: SEA, band2: SLATE, accent: SAND, line: "rgba(242,245,244,0.22)", disc: SAND, body: FOAM, pop: BUOY },
  { bg: SEA, band: SEA_DEEP, band2: SLATE, accent: BUOY, line: "rgba(242,245,244,0.20)", disc: FOAM, body: "#FFFFFF", pop: BUOY },
  { bg: SAND, band: SEA, band2: SLATE, accent: BUOY, line: "rgba(15,59,71,0.20)", disc: FOAM, body: "#FFFFFF", pop: BUOY },
  { bg: SAND, band: SLATE, band2: SEA_DEEP, accent: SEA, line: "rgba(15,59,71,0.16)", disc: FOAM, body: "#FFFFFF", pop: BUOY },
  { bg: SLATE, band: SEA_DEEP, band2: SAND, accent: FOAM, line: "rgba(242,245,244,0.20)", disc: SAND, body: FOAM, pop: BUOY },
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

// The subjects ------------------------------------------------------------------
//
// Each offer card gets one flat, cartoon subject on a disc: a pint for a pint, a
// book for a bookshop, scissors for the barber. The subject is chosen from what
// the offer says it is, so the picture is about the offer rather than decoration
// next to it. Everything is invented and nothing is a photograph, which is the
// point: a real photograph of a real bar attached to an invented name would
// misrepresent a business that never agreed to any of it.
//
// Every subject is drawn inside a 100 x 100 box in the same hand: thick round
// ink, a light body, one accent. `body` is the fill, `pop` the accent. They are
// always drawn on the disc, so the ink can be dark on every one of the five
// grounds without checking contrast case by case.

type Motif = (body: string, pop: string) => string;

const MOTIFS: Record<string, Motif> = {
  /** Coffee, tea, anything hot. */
  cup: (body, pop) =>
    [
      `<path d="M40 20c0 5-5 5-5 10s5 5 5 10" stroke="${pop}"/>`,
      `<path d="M56 14c0 5-5 5-5 10s5 5 5 10" stroke="${pop}"/>`,
      `<path d="M70 50h6a10 10 0 0 1 0 20h-7"/>`,
      `<path d="M24 46h46v12a23 23 0 0 1-46 0z" fill="${body}"/>`,
      `<path d="M28 54h38" stroke="${pop}"/>`,
      `<path d="M14 82h66"/>`,
    ].join(""),

  /** A pint. */
  pint: (body, pop) =>
    [
      `<path d="M32 20h38l-5 62a7 7 0 0 1-7 6H44a7 7 0 0 1-7-6z" fill="${body}"/>`,
      `<path d="M35 40h32l-4 42a7 7 0 0 1-7 6H46a7 7 0 0 1-7-6z" fill="${pop}" stroke="none"/>`,
      `<path d="M34 40h34"/>`,
      `<circle cx="47" cy="56" r="3.5" fill="${body}" stroke="none"/>`,
      `<circle cx="57" cy="70" r="3" fill="${body}" stroke="none"/>`,
    ].join(""),

  /** Wine, fizz, a bottle of something. */
  wine: (body, pop) =>
    [
      `<path d="M30 14h40v12a20 22 0 0 1-40 0z" fill="${body}"/>`,
      `<path d="M31 30h38a20 20 0 0 1-38 0z" fill="${pop}" stroke="none"/>`,
      `<path d="M50 48v30"/>`,
      `<path d="M32 84h36"/>`,
    ].join(""),

  /** A cocktail, a spritz, a dram made social. */
  cocktail: (body, pop) =>
    [
      `<path d="M60 36 78 12" stroke="${pop}"/>`,
      `<circle cx="78" cy="12" r="7" fill="${pop}"/>`,
      `<path d="M22 26h56L50 58z" fill="${body}"/>`,
      `<path d="M28 32h44l-8 9H36z" fill="${pop}" stroke="none"/>`,
      `<path d="M50 58v22"/>`,
      `<path d="M32 84h36"/>`,
    ].join(""),

  /** A plate with cutlery: lunch, dinner, a la carte. */
  plate: (body, pop) =>
    [
      `<path d="M14 18c6 8 6 20 0 28-6-8-6-20 0-28z" fill="${body}"/>`,
      `<path d="M14 46v36"/>`,
      `<path d="M79 18v14"/><path d="M86 18v14"/><path d="M93 18v14"/>`,
      `<path d="M79 32c0 7 3 11 7 11s7-4 7-11"/>`,
      `<path d="M86 43v39"/>`,
      `<circle cx="48" cy="52" r="28" fill="${body}"/>`,
      `<circle cx="48" cy="52" r="18" fill="none" opacity="0.35" stroke-width="3"/>`,
      `<circle cx="48" cy="52" r="10" fill="${pop}" stroke="none"/>`,
    ].join(""),

  /** A set menu, a two-course, a table d'hote. */
  menucard: (body, pop) =>
    [
      `<rect x="24" y="12" width="52" height="72" rx="7" fill="${body}"/>`,
      `<path d="M34 30h32" stroke="${pop}"/>`,
      `<path d="M34 46h32" stroke="${pop}"/>`,
      `<path d="M34 62h20" stroke="${pop}"/>`,
    ].join(""),

  /** Fish and chips, and the chip shop generally. */
  fishchips: (body, pop) =>
    [
      `<path d="M36 40 30 12" stroke="${pop}" stroke-width="9"/>`,
      `<path d="M50 40V6" stroke="${pop}" stroke-width="9"/>`,
      `<path d="M64 40l7-26" stroke="${pop}" stroke-width="9"/>`,
      `<path d="M22 38h56L64 90H36z" fill="${body}"/>`,
      `<path d="M28 56h44" opacity="0.3" stroke-width="3"/>`,
    ].join(""),

  /** Pizza. */
  pizza: (body, pop) =>
    [
      `<path d="M50 10 84 78a86 86 0 0 1-68 0z" fill="${body}"/>`,
      `<path d="M16 78a86 86 0 0 0 68 0" stroke="${pop}" stroke-width="9"/>`,
      `<circle cx="43" cy="52" r="5" fill="${pop}" stroke="none"/>`,
      `<circle cx="59" cy="46" r="4.5" fill="${pop}" stroke="none"/>`,
      `<circle cx="52" cy="68" r="5" fill="${pop}" stroke="none"/>`,
    ].join(""),

  /** A bowl: curry, noodles, anything with steam over it. */
  bowl: (body, pop) =>
    [
      `<path d="M38 18c0 5-5 5-5 10s5 5 5 10" stroke="${pop}"/>`,
      `<path d="M58 14c0 5-5 5-5 10s5 5 5 10" stroke="${pop}"/>`,
      `<path d="M30 50a20 13 0 0 1 40 0z" fill="${pop}" stroke="none"/>`,
      `<path d="M20 50h60a30 30 0 0 1-60 0z" fill="${body}"/>`,
      `<path d="M14 50h72"/>`,
    ].join(""),

  /** A burger. */
  burger: (body, pop) =>
    [
      `<path d="M20 46c0-16 13-26 30-26s30 10 30 26z" fill="${body}"/>`,
      `<path d="M36 32h.01"/><path d="M50 28h.01"/><path d="M64 32h.01"/>`,
      `<path d="M18 46h64c0 8-6 9-10 6-4 4-8 4-12 0-4 4-8 4-12 0-4 3-10 2-10-6z" fill="${pop}" stroke="none"/>`,
      `<path d="M18 46h64"/>`,
      `<rect x="20" y="56" width="60" height="12" rx="6" fill="${pop}"/>`,
      `<path d="M20 70h60c0 8-6 12-14 12H34c-8 0-14-4-14-12z" fill="${body}"/>`,
    ].join(""),

  /** Cake, scones, afternoon tea, anything sweet. */
  cake: (body, pop) =>
    [
      `<path d="M50 30v-8" stroke="${pop}"/>`,
      `<circle cx="50" cy="34" r="7" fill="${pop}"/>`,
      `<path d="M22 48c7-9 14-9 21 0 7-9 14-9 21 0 4-5 8-7 12-6v30a7 7 0 0 1-7 6H29a7 7 0 0 1-7-6z" fill="${body}"/>`,
      `<path d="M24 64h52" stroke="${pop}" stroke-width="7"/>`,
    ].join(""),

  /** A sandwich, a toastie, a filled roll. */
  sandwich: (body, pop) =>
    [
      // One half, not two. Two triangles side by side read as mountains.
      `<path d="M50 10 94 84H6z" fill="${body}"/>`,
      `<path d="M26 58h48" stroke="${pop}" stroke-width="9"/>`,
      `<path d="M18 72h64" stroke="${pop}" stroke-width="9"/>`,
    ].join(""),

  /**
   * Breakfast: an egg and two rashers on a plate.
   *
   * Drawn on a square plate with the egg well off centre and the rashers straight
   * and parallel. A round plate with a round egg centred in it, or a curve under
   * it, reads as a face at card size, which two earlier attempts both did.
   */
  breakfast: (body, pop) =>
    [
      `<rect x="8" y="24" width="84" height="54" rx="12" fill="${body}"/>`,
      `<ellipse cx="34" cy="50" rx="19" ry="15" fill="#FFFFFF"/>`,
      `<circle cx="34" cy="50" r="7" fill="${pop}" stroke="none"/>`,
      `<path d="M60 68 72 34" stroke="${pop}" stroke-width="9"/>`,
      `<path d="M74 68 86 34" stroke="${pop}" stroke-width="9"/>`,
    ].join(""),

  /** Ice cream. */
  icecream: (body, pop) =>
    [
      `<circle cx="41" cy="32" r="16" fill="${body}"/>`,
      `<circle cx="61" cy="36" r="14" fill="${body}"/>`,
      `<path d="M26 48h50L52 92z" fill="${pop}"/>`,
      `<path d="M36 60 48 74" opacity="0.4" stroke-width="3"/>`,
      `<path d="M50 58 60 68" opacity="0.4" stroke-width="3"/>`,
    ].join(""),

  /** A book. */
  book: (body, pop) =>
    [
      `<path d="M50 30c-8-8-21-11-34-9v48c13-2 26 1 34 9z" fill="${body}"/>`,
      `<path d="M50 30c8-8 21-11 34-9v48c-13-2-26 1-34 9z" fill="${body}"/>`,
      `<path d="M50 30v48"/>`,
      `<path d="M26 40h14" stroke="${pop}" stroke-width="4"/>`,
      `<path d="M26 52h16" stroke="${pop}" stroke-width="4"/>`,
      `<path d="M60 40h14" stroke="${pop}" stroke-width="4"/>`,
      `<path d="M60 52h16" stroke="${pop}" stroke-width="4"/>`,
    ].join(""),

  /** A present: gifts, cards, homeware. */
  gift: (body, pop) =>
    [
      `<path d="M50 32c-5-11-18-15-20-6s11 9 20 6z" fill="${pop}"/>`,
      `<path d="M50 32c5-11 18-15 20-6s-11 9-20 6z" fill="${pop}"/>`,
      `<rect x="20" y="44" width="60" height="42" rx="7" fill="${body}"/>`,
      `<rect x="14" y="32" width="72" height="14" rx="5" fill="${body}"/>`,
      `<path d="M50 32v54" stroke="${pop}" stroke-width="8"/>`,
    ].join(""),

  /** Scissors: the barber. */
  scissors: (body, pop) =>
    [
      `<path d="M36 66 72 16"/>`,
      `<path d="M58 66 22 16"/>`,
      `<circle cx="30" cy="76" r="11" fill="${body}"/>`,
      `<circle cx="64" cy="76" r="11" fill="${body}"/>`,
      `<circle cx="47" cy="46" r="5" fill="${pop}" stroke="none"/>`,
    ].join(""),

  /** A kayak on the water: anything out of doors. */
  kayak: (body, pop) =>
    [
      `<path d="M20 30 80 58"/>`,
      `<path d="M14 26 26 34" stroke-width="8"/>`,
      `<path d="M74 54 86 62" stroke-width="8"/>`,
      `<circle cx="50" cy="42" r="10" fill="${body}"/>`,
      `<path d="M12 62c14-11 62-11 76 0-14 11-62 11-76 0z" fill="${body}"/>`,
      `<path d="M8 82q13-7 26 0t26 0 26 0" opacity="0.45"/>`,
    ].join(""),

  /** A key: a room, a stay. */
  key: (body, pop) =>
    [
      `<circle cx="32" cy="38" r="18" fill="${body}"/>`,
      `<circle cx="32" cy="38" r="7" fill="${pop}" stroke="none"/>`,
      `<path d="M45 51 78 84"/>`,
      `<path d="M62 68 54 76"/>`,
      `<path d="M70 76 62 84"/>`,
    ].join(""),

  /** A shopping bag: the shops. */
  bag: (body, pop) =>
    [
      `<path d="M37 42V31a13 13 0 0 1 26 0v11"/>`,
      `<path d="M20 42h60l-6 44a7 7 0 0 1-7 6H33a7 7 0 0 1-7-6z" fill="${body}"/>`,
      `<rect x="42" y="58" width="16" height="16" rx="4" fill="${pop}" stroke="none"/>`,
    ].join(""),

  /** A price tag: the fallback, and it is not a bad one. */
  tag: (body, pop) =>
    [
      `<path d="M50 14h32v32L46 84 12 50z" fill="${body}"/>`,
      `<circle cx="69" cy="27" r="7" fill="${pop}" stroke="none"/>`,
    ].join(""),
};

/**
 * What the offer is about, in one word.
 *
 * Read in order, so the specific beats the general: "breakfast roll" is a
 * breakfast, not a roll, and "two-course menu" is a set menu, not a plate. The
 * outlet's category is the last resort, which is why a keyword list this short
 * covers a whole town.
 */
const KEYWORDS: [RegExp, string][] = [
  [/kayak|paddle|surf|coastal|guided|tour/, "kayak"],
  [/haircut|barber|shave|beard|trim|cut and finish|dry cut/, "scissors"],
  [/book|paperback|hardback|reading|author/, "book"],
  [/gift|candle|homeware|present|wrap|card/, "gift"],
  [/room|overnight|stay the night|two nights|suite/, "key"],
  [/pizza/, "pizza"],
  [/burger/, "burger"],
  [/chips|fish|haddock|supper|fry|batter/, "fishchips"],
  [/curry|masala|noodle|katsu|ramen|thai|szechuan|biryani|soup|bowl/, "bowl"],
  [/ice cream|gelato|sundae|99|cone/, "icecream"],
  [/breakfast|brunch|bacon|egg|porridge|morning roll/, "breakfast"],
  [/set menu|two-course|three-course|two course|three course|courses|tasting/, "menucard"],
  [/cake|scone|bake|pastry|brownie|traybake|tray bake|afternoon tea|dessert|pudding|cranachan|sweet/, "cake"],
  [/sandwich|toastie|panini|baguette|wrap|roll|piece/, "sandwich"],
  [/coffee|flat white|latte|espresso|cappuccino|americano|brew|cuppa|pot of tea|tea and/, "cup"],
  [/pint|beer|ale|lager|cask|stout|IPA|keg/, "pint"],
  [/cocktail|spritz|negroni|martini|highball|gin|whisky|dram|rum/, "cocktail"],
  [/wine|fizz|prosecco|champagne|bottle|carafe|glass of/, "wine"],
  [/lunch|dinner|a la carte|main|steak|roast|table|plate|food/, "plate"],
  [/takeaway|collection|to go/, "fishchips"],
  [/shop|browse|off the rail|any item|in store/, "bag"],
];

const BY_CATEGORY: Record<string, string[]> = {
  restaurant: ["plate", "menucard", "bowl"],
  pub: ["pint", "plate", "cocktail"],
  bar: ["cocktail", "wine", "plate"],
  cafe: ["cup", "cake", "sandwich"],
  takeaway: ["fishchips", "bowl", "burger"],
  hotel: ["key", "breakfast", "plate"],
  retail: ["bag", "gift", "tag"],
  services: ["scissors", "tag", "bag"],
  experience: ["kayak", "tag", "key"],
};

function motifFor(text: string, category: string, index: number): Motif {
  const haystack = text.toLowerCase();
  for (const [pattern, name] of KEYWORDS) {
    if (pattern.test(haystack)) return MOTIFS[name];
  }
  const rota = BY_CATEGORY[category] ?? ["tag"];
  return MOTIFS[rota[index % rota.length]] ?? MOTIFS.tag;
}

// The grounds -------------------------------------------------------------------
//
// Three backdrops, stepped by offer index, so an outlet's three cards do not
// stack up identically in a list. They stay quiet: the subject is the picture.

const DISC_X = 200;
const DISC_Y = 88;
const DISC_R = 66;

type Ground = (w: Way, r: () => number) => string;

/** Sea and sky: two bands and a horizon. */
const banded: Ground = (w, r) => {
  const horizon = 104 + r() * 12;
  return [
    `<rect width="${W}" height="${H}" fill="${w.bg}"/>`,
    `<path d="M0 ${n(horizon)}h${W}v${n(H - horizon)}H0z" fill="${w.band}"/>`,
    `<path d="M0 ${n(horizon + 30)}h${W}v${n(H - horizon - 30)}H0z" fill="${w.band2}" opacity="0.45"/>`,
    `<g stroke="${w.line}" stroke-width="2" fill="none">`,
    `<path d="M0 ${n(horizon - 22)}h${W}"/><path d="M0 ${n(horizon + 14)}h${W}"/>`,
    `</g>`,
  ].join("");
};

/** Rays out of the disc, the way a sticker is drawn. */
const rays: Ground = (w, r) => {
  const start = r() * 30;
  const wedges = Array.from({ length: 12 }, (_, i) => {
    const a = ((start + i * 30) * Math.PI) / 180;
    const b = a + 0.2;
    const far = 340;
    return (
      `<path d="M${DISC_X} ${DISC_Y}L${n(DISC_X + Math.cos(a) * far)} ${n(DISC_Y + Math.sin(a) * far)}` +
      `L${n(DISC_X + Math.cos(b) * far)} ${n(DISC_Y + Math.sin(b) * far)}z" fill="${w.band}" opacity="0.5"/>`
    );
  }).join("");
  return [`<rect width="${W}" height="${H}" fill="${w.bg}"/>`, wedges].join("");
};

/** A field of dots, and a shelf for the subject to sit on. */
const dotted: Ground = (w, r) => {
  const offset = r() * 12;
  const dots = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 14 }, (_, col) => {
      const x = 8 + col * 24 + (row % 2 ? 12 : 0);
      const y = 10 + row * 24 + offset;
      return `<circle cx="${n(x)}" cy="${n(y)}" r="3" fill="${w.line}"/>`;
    }).join(""),
  ).join("");
  return [
    `<rect width="${W}" height="${H}" fill="${w.bg}"/>`,
    dots,
    `<path d="M0 152h${W}v28H0z" fill="${w.band}"/>`,
  ].join("");
};

const GROUNDS: Ground[] = [banded, rays, dotted];

/**
 * A 16:9 picture for one offer card.
 *
 * The colourway comes from the outlet, so an outlet's offers read as a set. The
 * subject comes from the offer's own words. The disc is not decoration: it is
 * what lets one set of dark ink work on all five grounds, and it keeps the
 * subject clear of the discount badge sitting over the top-left corner.
 */
export function offerArt(
  outletSlug: string,
  offerTitle: string,
  offerIndex: number,
  category: string,
  extraText = "",
): string {
  const way = WAYS[hash(outletSlug) % WAYS.length];
  const ground = GROUNDS[(hash(outletSlug) + offerIndex) % GROUNDS.length];
  const motif = motifFor(`${offerTitle} ${extraText}`, category, offerIndex);
  const scale = 1.16;
  const origin = n(DISC_R - (100 * scale) / 2);
  const body = [
    ground(way, rng(`${outletSlug}:${offerTitle}:${offerIndex}`)),
    `<circle cx="${DISC_X}" cy="${DISC_Y}" r="${DISC_R}" fill="${way.disc}"/>`,
    `<circle cx="${DISC_X}" cy="${DISC_Y}" r="${DISC_R - 6}" fill="none" stroke="${SEA_DEEP}" stroke-width="2" opacity="0.14"/>`,
    `<g transform="translate(${n(DISC_X - DISC_R + origin)} ${n(DISC_Y - DISC_R + origin)}) scale(${scale})" ` +
      `fill="none" stroke="${SEA_DEEP}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">`,
    motif(way.body, way.pop),
    `</g>`,
  ].join("");
  return svgUrl(body, W, H);
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
