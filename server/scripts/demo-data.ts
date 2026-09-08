import type { CardPattern, CardTheme, MERCHANT_CATEGORIES, OfferType } from "@shared/schema";

/**
 * The invented town behind `npm run seed:demo`.
 *
 * Every outlet name here is made up. Real St Andrews street names, postcodes and
 * coordinates are used on purpose, because a demo map is only convincing if the
 * pins sit on real streets — but attaching an invented offer to a real trader's
 * name would misrepresent a business that never agreed to any of it, and in a
 * town this size that would be noticed. Invented name, real address.
 *
 * Offers are specified as fully as a careful merchant would fill the form in:
 * tags, minimum spends, discount caps, per-resident limits, dine-in and alcohol
 * flags, blackout weeks. The figures are sector-plausible — a cafe's minimum
 * spend is not a restaurant's — because a demo where every offer carries the
 * same round numbers reads as a demo.
 */

export type Category = (typeof MERCHANT_CATEGORIES)[number];
export type Plan = "free" | "standard" | "insight";

/**
 * A street as a straight line between two ends, so outlets can be placed along it
 * at a fraction of its length rather than scattered around the town centre.
 */
interface Street {
  postcode: string;
  from: [number, number];
  to: [number, number];
}

export const STREETS = {
  market: { postcode: "KY16 9NX", from: [56.3397, -2.797], to: [56.3392, -2.791] },
  south: { postcode: "KY16 9QR", from: [56.3383, -2.7975], to: [56.3376, -2.7885] },
  north: { postcode: "KY16 9AJ", from: [56.3411, -2.7965], to: [56.34, -2.7898] },
  bell: { postcode: "KY16 9UR", from: [56.3398, -2.7975], to: [56.3385, -2.7979] },
  church: { postcode: "KY16 9NN", from: [56.3393, -2.792], to: [56.3383, -2.7924] },
  cityRoad: { postcode: "KY16 9TX", from: [56.341, -2.801], to: [56.3382, -2.8] },
  argyle: { postcode: "KY16 9BX", from: [56.3383, -2.802], to: [56.3378, -2.8055] },
  golfPlace: { postcode: "KY16 9JA", from: [56.3428, -2.801], to: [56.3438, -2.8016] },
  scores: { postcode: "KY16 9AR", from: [56.3425, -2.7995], to: [56.341, -2.791] },
  greyfriars: { postcode: "KY16 9HG", from: [56.3405, -2.7985], to: [56.3398, -2.7982] },
  abbey: { postcode: "KY16 9LB", from: [56.3377, -2.79], to: [56.3368, -2.7893] },
  largo: { postcode: "KY16 8NL", from: [56.3368, -2.802], to: [56.3348, -2.8038] },
  bridge: { postcode: "KY16 9ND", from: [56.338, -2.7995], to: [56.3376, -2.8005] },
} satisfies Record<string, Street>;

export type StreetKey = keyof typeof STREETS;

export const STREET_NAMES: Record<StreetKey, string> = {
  market: "Market Street",
  south: "South Street",
  north: "North Street",
  bell: "Bell Street",
  church: "Church Street",
  cityRoad: "City Road",
  argyle: "Argyle Street",
  golfPlace: "Golf Place",
  scores: "The Scores",
  greyfriars: "Greyfriars Garden",
  abbey: "Abbey Street",
  largo: "Largo Road",
  bridge: "Bridge Street",
};

/** A point a fraction `t` along a street, nudged sideways so pins do not stack. */
export function pointOn(street: StreetKey, t: number, side: number): { lat: string; lng: string } {
  const s = STREETS[street];
  const lat = s.from[0] + (s.to[0] - s.from[0]) * t + side * 0.00012;
  const lng = s.from[1] + (s.to[1] - s.from[1]) * t;
  return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
}

// Offers ------------------------------------------------------------------------

export interface DemoBlackout {
  name: string;
  startDate: string;
  endDate: string;
}

export interface DemoMenu {
  heading: string;
  lines: string[];
}

export interface DemoOffer {
  title: string;
  shortPromo: string;
  type: OfferType;
  percentOff?: number;
  fixedPrice?: number;
  originalValue?: number;
  typicalSpend?: number;
  itemValue?: number;
  daysOfWeek?: string[];
  timeSlots?: Record<string, { start: string; end: string }[]>;
  terms?: string;
  tags?: string[];
  minBasket?: number;
  /** Caps what a percentage offer can take off a large bill. */
  maxDiscount?: number;
  maxPerDay?: number;
  maxPerWeek?: number;
  maxLifetime?: number;
  globalUsageLimit?: number;
  dineInOnly?: boolean;
  excludesAlcohol?: boolean;
  newCustomerOnly?: boolean;
  blackout?: DemoBlackout[];
  /** Restricted to the outlet's top loyalty tier; resolved to a tier id when seeded. */
  topTierOnly?: boolean;
  /** A set menu worth attaching a PDF to. */
  menu?: DemoMenu;
}

/** Day and time restrictions, so the map's "on now" filter and the timing charts have something real. */
function when(days: string[], start?: string, end?: string): Pick<DemoOffer, "daysOfWeek" | "timeSlots"> {
  if (!start || !end) return { daysOfWeek: days };
  const timeSlots: Record<string, { start: string; end: string }[]> = {};
  for (const d of days) timeSlots[d] = [{ start, end }];
  return { daysOfWeek: days, timeSlots };
}

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri"];
const EVERY_DAY = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * Blackout weeks. Both sit in the future so they can be seen in the merchant
 * form without silently pulling an offer out of the demo's live listings.
 */
const CHRISTMAS: DemoBlackout = { name: "Christmas", startDate: "2026-12-24", endDate: "2026-12-28" };
const GRADUATION: DemoBlackout = { name: "Graduation week", startDate: "2027-06-21", endDate: "2027-06-26" };

// Business hours ----------------------------------------------------------------

type DaySpec = Record<string, [string, string]>;

const hours = (spec: DaySpec): string =>
  JSON.stringify(Object.fromEntries(Object.entries(spec).map(([d, [open, close]]) => [d, { open, close }])));

/**
 * Opening hours by sector, because 24 outlets all open 09:00 to 22:00 is the
 * single clearest tell that data was generated. A day left out is a day closed.
 */
export const HOURS = {
  cafe: hours({
    mon: ["07:30", "17:00"], tue: ["07:30", "17:00"], wed: ["07:30", "17:00"], thu: ["07:30", "17:00"],
    fri: ["07:30", "17:30"], sat: ["08:00", "17:30"], sun: ["09:00", "16:00"],
  }),
  cafeEarly: hours({
    mon: ["07:00", "15:00"], tue: ["07:00", "15:00"], wed: ["07:00", "15:00"], thu: ["07:00", "15:00"],
    fri: ["07:00", "15:00"], sat: ["08:00", "14:00"],
  }),
  restaurant: hours({
    tue: ["12:00", "22:00"], wed: ["12:00", "22:00"], thu: ["12:00", "22:00"],
    fri: ["12:00", "23:00"], sat: ["12:00", "23:00"], sun: ["12:00", "21:00"],
  }),
  restaurantSeven: hours({
    mon: ["17:00", "22:00"], tue: ["12:00", "22:00"], wed: ["12:00", "22:00"], thu: ["12:00", "22:00"],
    fri: ["12:00", "23:00"], sat: ["12:00", "23:00"], sun: ["12:00", "21:00"],
  }),
  pub: hours({
    mon: ["11:00", "23:00"], tue: ["11:00", "23:00"], wed: ["11:00", "23:00"], thu: ["11:00", "23:30"],
    fri: ["11:00", "00:30"], sat: ["11:00", "00:30"], sun: ["12:30", "23:00"],
  }),
  pubLate: hours({
    mon: ["12:00", "23:30"], tue: ["12:00", "23:30"], wed: ["12:00", "23:30"], thu: ["12:00", "00:30"],
    fri: ["12:00", "01:00"], sat: ["12:00", "01:00"], sun: ["12:30", "23:00"],
  }),
  bar: hours({
    tue: ["16:00", "23:30"], wed: ["16:00", "23:30"], thu: ["16:00", "00:00"],
    fri: ["16:00", "01:00"], sat: ["16:00", "01:00"], sun: ["16:00", "22:30"],
  }),
  takeaway: hours({
    mon: ["16:30", "22:00"], tue: ["16:30", "22:00"], wed: ["16:30", "22:00"], thu: ["16:30", "22:30"],
    fri: ["16:00", "23:00"], sat: ["16:00", "23:00"], sun: ["16:30", "21:30"],
  }),
  takeawayLate: hours({
    mon: ["17:00", "23:00"], tue: ["17:00", "23:00"], wed: ["17:00", "23:00"], thu: ["17:00", "23:30"],
    fri: ["17:00", "00:30"], sat: ["17:00", "00:30"], sun: ["17:00", "23:00"],
  }),
  hotel: hours({
    mon: ["07:00", "23:00"], tue: ["07:00", "23:00"], wed: ["07:00", "23:00"], thu: ["07:00", "23:00"],
    fri: ["07:00", "23:30"], sat: ["07:30", "23:30"], sun: ["07:30", "22:30"],
  }),
  retail: hours({
    mon: ["09:30", "17:30"], tue: ["09:30", "17:30"], wed: ["09:30", "17:30"], thu: ["09:30", "17:30"],
    fri: ["09:30", "17:30"], sat: ["09:30", "18:00"], sun: ["11:00", "16:00"],
  }),
  services: hours({
    tue: ["09:00", "17:30"], wed: ["09:00", "17:30"], thu: ["09:00", "19:00"],
    fri: ["09:00", "18:00"], sat: ["08:30", "16:00"],
  }),
  experience: hours({
    wed: ["09:00", "17:00"], thu: ["09:00", "17:00"], fri: ["09:00", "17:30"],
    sat: ["08:30", "18:00"], sun: ["08:30", "17:00"],
  }),
} as const;

// Loyalty -----------------------------------------------------------------------

export interface DemoTier {
  name: string;
  /** Status points needed in the rolling window. */
  threshold: number;
  /** Above 1 on the upper tiers of a points programme. */
  multiplier: number;
  /** Flat discount carried by the top tier of roughly half the programmes. */
  discountPercent?: number;
}

export interface DemoReward {
  name: string;
  costPoints?: number;
  claimRule: "once" | "weekly" | "monthly" | "unlimited";
  /** Index into `tiers`: members of this tier and above only. Costless entries are tier benefits. */
  tier?: number;
  terms?: string;
}

export interface DemoLoyalty {
  pointsPerCurrency: number;
  pointsPerRedemption: number;
  minBasketEarn: number;
  earnCooldownMinutes: number;
  dailyEarnCap: number;
  tierWindowDays: number;
  tiers: DemoTier[];
  rewards: DemoReward[];
}

export interface DemoOutlet {
  name: string;
  slug: string;
  category: Category;
  street: StreetKey;
  /** Position along the street, 0 at the first end. */
  t: number;
  side: number;
  houseNumber: string;
  phone: string;
  plan: Plan;
  theme: CardTheme;
  pattern: CardPattern;
  hours: string;
  reservation?: { provider: string; url: string };
  /** Only ever set on a paying outlet: loyalty is a Standard feature. */
  loyalty?: DemoLoyalty;
  offers: DemoOffer[];
}

/**
 * The five outlets that verify residents on the operator's behalf.
 *
 * Deliberately spread across the town rather than clustered on one street, so
 * nobody has to walk the length of St Andrews to be verified: the middle of
 * Market Street, the north-west by the golf course, the east end past the abbey,
 * the Largo Road end, and the west end of South Street. They are also open at
 * different times of day between them.
 */
export const VERIFYING_SLUGS: readonly string[] = [
  "bramble-beam", // Market Street, middle of town
  "gowfers-rest", // Golf Place, north-west
  "netmakers-arms", // Abbey Street, east
  "spice-lantern", // Largo Road, south-west
  "tolbooth-books", // South Street, west end
];

export const OUTLETS: DemoOutlet[] = [
  // Restaurants ------------------------------------------------------------
  {
    name: "The Harrow & Herring", slug: "harrow-herring", category: "restaurant", street: "south", t: 0.35, side: 1,
    houseNumber: "48", phone: "01334 470118", plan: "insight", theme: "sea", pattern: "wave",
    hours: HOURS.restaurant,
    reservation: { provider: "opentable", url: "https://book.harrow-herring.test/reserve" },
    loyalty: {
      pointsPerCurrency: 8, pointsPerRedemption: 350, minBasketEarn: 15,
      earnCooldownMinutes: 45, dailyEarnCap: 2, tierWindowDays: 365,
      tiers: [
        { name: "Deckhand", threshold: 0, multiplier: 1 },
        { name: "Bosun", threshold: 600, multiplier: 1.1 },
        { name: "Skipper", threshold: 1300, multiplier: 1.25 },
        { name: "Harbourmaster", threshold: 4000, multiplier: 1.5, discountPercent: 12 },
      ],
      rewards: [
        { name: "Dessert of the day", costPoints: 900, claimRule: "monthly" },
        { name: "Bottle of house wine", costPoints: 2400, claimRule: "unlimited" },
        { name: "Harbourmaster's table wine", claimRule: "weekly", tier: 3 },
        { name: "Welcome glass of fizz", costPoints: 400, claimRule: "once" },
      ],
    },
    offers: [
      {
        title: "15% off the a la carte menu", shortPromo: "15% off food, Sunday to Thursday",
        type: "percentage_discount", percentOff: 15, typicalSpend: 44, maxDiscount: 15, minBasket: 25,
        dineInOnly: true, excludesAlcohol: true, tags: ["dinner", "a la carte", "midweek"],
        ...when(["sun", "mon", "tue", "wed", "thu"]),
      },
      {
        title: "Two-course residents' menu", shortPromo: "Two courses for £22", type: "set_menu",
        fixedPrice: 22, originalValue: 31, dineInOnly: true, maxPerWeek: 2, tags: ["set menu", "early dinner"],
        terms: "Two courses from the residents' menu. Sides and drinks are extra.",
        menu: {
          heading: "Residents' menu — two courses for £22",
          lines: [
            "Starters:", "Cullen skink, chive oil", "Beetroot, whipped curd, hazelnut", "Warm bread, seaweed butter",
            "Mains:", "Hake, brown shrimp butter, greens", "Barley risotto, roast squash", "Braised shoulder, mash, kale",
            "Puddings (£6 extra):", "Cranachan", "Chocolate and sea salt tart",
          ],
        },
        ...when(WEEKDAYS, "17:00", "19:00"),
      },
      {
        title: "Free glass of fizz with two mains", shortPromo: "A glass on the house with two mains",
        type: "free_item_with_purchase", itemValue: 7.5, minBasket: 30, maxPerDay: 1, dineInOnly: true,
        topTierOnly: true, tags: ["weekend", "dinner", "loyalty"],
        ...when(["fri", "sat"], "17:00", "21:30"),
      },
    ],
  },
  {
    name: "Kinnaird Table", slug: "kinnaird-table", category: "restaurant", street: "market", t: 0.62, side: -1,
    houseNumber: "71", phone: "01334 470224", plan: "standard", theme: "ink", pattern: "plain",
    hours: HOURS.restaurant,
    reservation: { provider: "resdiary", url: "https://reservations.kinnaird-table.test/book" },
    loyalty: {
      pointsPerCurrency: 10, pointsPerRedemption: 450, minBasketEarn: 20,
      earnCooldownMinutes: 60, dailyEarnCap: 1, tierWindowDays: 730,
      tiers: [
        { name: "Regular", threshold: 0, multiplier: 1 },
        { name: "Table Holder", threshold: 500, multiplier: 1.2 },
        { name: "House Guest", threshold: 1800, multiplier: 1.4 },
      ],
      rewards: [
        { name: "Coffee and petit fours", costPoints: 800, claimRule: "monthly" },
        { name: "Chef's starter to share", costPoints: 2000, claimRule: "unlimited" },
        { name: "House Guest aperitif", claimRule: "weekly", tier: 2 },
      ],
    },
    offers: [
      {
        title: "£10 off a bill over £50", shortPromo: "£10 off when you spend £50", type: "fixed_amount_discount",
        fixedPrice: 10, minBasket: 50, maxPerWeek: 1, dineInOnly: true, tags: ["dinner", "big bill"],
        ...when(EVERY_DAY),
      },
      {
        title: "Early table, three courses", shortPromo: "Three courses for £26 before 7pm", type: "set_menu",
        fixedPrice: 26, originalValue: 38, dineInOnly: true, blackout: [GRADUATION], tags: ["set menu", "early dinner"],
        menu: {
          heading: "Early table — three courses for £26",
          lines: [
            "To begin:", "Smoked trout, pickled cucumber", "Onion and thyme tart", "Soup of the day",
            "Mains:", "Roast cod, white beans", "Guinea fowl, buttered leeks", "Wild mushroom pithivier",
            "Puddings:", "Lemon posset", "Dark chocolate mousse", "Scottish cheese, oatcakes (£4 extra)",
          ],
        },
        ...when(["tue", "wed", "thu"], "17:30", "19:00"),
      },
    ],
  },
  {
    name: "Saltgrass Kitchen", slug: "saltgrass-kitchen", category: "restaurant", street: "bell", t: 0.4, side: 1,
    houseNumber: "14", phone: "01334 470336", plan: "standard", theme: "moss", pattern: "stripe",
    hours: HOURS.restaurantSeven,
    reservation: { provider: "sevenrooms", url: "https://tables.saltgrass-kitchen.test" },
    loyalty: {
      pointsPerCurrency: 12, pointsPerRedemption: 430, minBasketEarn: 10,
      earnCooldownMinutes: 30, dailyEarnCap: 3, tierWindowDays: 180,
      tiers: [
        { name: "Sprout", threshold: 0, multiplier: 1 },
        { name: "Grower", threshold: 700, multiplier: 1.15 },
        { name: "Cropper", threshold: 1900, multiplier: 1.3 },
        { name: "Head Gardener", threshold: 3500, multiplier: 1.45, discountPercent: 10 },
      ],
      rewards: [
        { name: "Side dish on the house", costPoints: 700, claimRule: "weekly" },
        { name: "Sunday lunch for one", costPoints: 2600, claimRule: "unlimited" },
        { name: "Head Gardener's tasting plate", claimRule: "monthly", tier: 3 },
        { name: "First-visit brownie", costPoints: 300, claimRule: "once" },
      ],
    },
    offers: [
      {
        title: "20% off Monday and Tuesday dinner", shortPromo: "20% off dinner at the start of the week",
        type: "percentage_discount", percentOff: 20, typicalSpend: 36, maxDiscount: 12, dineInOnly: true,
        excludesAlcohol: true, tags: ["dinner", "midweek", "vegetarian"],
        ...when(["mon", "tue"], "17:00", "21:00"),
      },
      {
        title: "Two for one on small plates", shortPromo: "Two small plates for the price of one", type: "bogo",
        itemValue: 8.5, maxPerDay: 1, dineInOnly: true, tags: ["small plates", "sharing"],
        terms: "The cheaper plate is the free one. Two plates per table.",
        ...when(["wed", "thu"], "17:00", "20:00"),
      },
      {
        title: "Weekday lunch bowl", shortPromo: "Any lunch bowl for £9", type: "fixed_price", fixedPrice: 9,
        originalValue: 13.5, maxPerDay: 1, tags: ["lunch", "vegetarian", "quick"],
        ...when(WEEKDAYS, "12:00", "14:30"),
      },
    ],
  },
  {
    name: "The Copper Quay", slug: "copper-quay", category: "restaurant", street: "north", t: 0.55, side: -1,
    houseNumber: "93", phone: "01334 470447", plan: "free", theme: "rust", pattern: "plain",
    hours: HOURS.restaurantSeven,
    reservation: { provider: "website", url: "https://copper-quay.test/book-a-table" },
    offers: [
      {
        title: "10% off every visit", shortPromo: "10% off food for residents", type: "percentage_discount",
        percentOff: 10, typicalSpend: 38, maxDiscount: 8, excludesAlcohol: true, tags: ["all day", "food"],
        ...when(EVERY_DAY),
      },
      {
        title: "Free side with any main", shortPromo: "A side on the house with any main",
        type: "free_item_with_purchase", itemValue: 4.5, minBasket: 12, maxPerDay: 1, tags: ["lunch", "dinner"],
        ...when(EVERY_DAY, "12:00", "21:00"),
      },
    ],
  },
  {
    name: "Braeburn Dining Room", slug: "braeburn-dining", category: "restaurant", street: "cityRoad", t: 0.3, side: 1,
    houseNumber: "9", phone: "01334 470559", plan: "standard", theme: "plum", pattern: "wave",
    hours: HOURS.restaurant,
    reservation: { provider: "quandoo", url: "https://booking.braeburn-dining.test" },
    loyalty: {
      pointsPerCurrency: 6, pointsPerRedemption: 250, minBasketEarn: 25,
      earnCooldownMinutes: 120, dailyEarnCap: 1, tierWindowDays: 365,
      tiers: [
        { name: "Orchard", threshold: 0, multiplier: 1 },
        { name: "Blossom", threshold: 400, multiplier: 1.2 },
        { name: "First Pressing", threshold: 900, multiplier: 1.35 },
      ],
      rewards: [
        { name: "Aperitif on arrival", costPoints: 600, claimRule: "monthly" },
        { name: "Cheese course for two", costPoints: 1800, claimRule: "unlimited" },
        { name: "First Pressing corkage waived", claimRule: "monthly", tier: 2 },
      ],
    },
    offers: [
      {
        title: "Sunday roast for £16", shortPromo: "Roast of the day, £16", type: "fixed_price", fixedPrice: 16,
        originalValue: 22, maxPerWeek: 1, dineInOnly: true, blackout: [CHRISTMAS], tags: ["sunday", "roast", "families"],
        terms: "Book ahead at the weekend. Children's portions at half price.",
        ...when(["sun"], "12:00", "16:00"),
      },
      {
        title: "12% off Wednesday to Friday", shortPromo: "12% off midweek dinner", type: "percentage_discount",
        percentOff: 12, typicalSpend: 41, maxDiscount: 10, excludesAlcohol: true, tags: ["dinner", "midweek"],
        ...when(["wed", "thu", "fri"], "17:00", "21:30"),
      },
    ],
  },

  // Pubs -------------------------------------------------------------------
  {
    name: "The Gowfer's Rest", slug: "gowfers-rest", category: "pub", street: "golfPlace", t: 0.35, side: 1,
    houseNumber: "6", phone: "01334 471102", plan: "insight", theme: "moss", pattern: "plain",
    hours: HOURS.pub,
    reservation: { provider: "website", url: "https://gowfers-rest.test/tables" },
    loyalty: {
      pointsPerCurrency: 15, pointsPerRedemption: 360, minBasketEarn: 0,
      earnCooldownMinutes: 20, dailyEarnCap: 4, tierWindowDays: 365,
      tiers: [
        { name: "Caddie", threshold: 0, multiplier: 1 },
        { name: "Club Member", threshold: 450, multiplier: 1.15 },
        { name: "Course Record", threshold: 1300, multiplier: 1.3 },
        { name: "Honours Board", threshold: 5000, multiplier: 1.6, discountPercent: 15 },
      ],
      rewards: [
        { name: "Pint of the week", costPoints: 700, claimRule: "weekly" },
        { name: "Whisky of the month dram", costPoints: 1800, claimRule: "monthly" },
        { name: "Honours Board dram", claimRule: "weekly", tier: 3 },
        { name: "First round toastie", costPoints: 400, claimRule: "once" },
      ],
    },
    offers: [
      {
        title: "£1 off every pint", shortPromo: "£1 off pints, all week", type: "fixed_amount_discount",
        fixedPrice: 1, maxPerDay: 4, tags: ["drinks", "all week"],
        ...when(EVERY_DAY),
      },
      {
        title: "Two for one on house drams", shortPromo: "Two drams for the price of one", type: "bogo",
        itemValue: 5.2, maxPerDay: 1, topTierOnly: true, tags: ["whisky", "loyalty"],
        ...when(["thu", "fri"], "17:00", "21:00"),
      },
      {
        title: "Off-peak Monday, 20% off", shortPromo: "20% off the whole bill on Mondays", type: "off_peak",
        percentOff: 20, typicalSpend: 24, maxDiscount: 8, tags: ["quiet night", "monday"],
        ...when(["mon"], "16:00", "22:00"),
      },
      {
        title: "Pie and a pint for £12", shortPromo: "Pie and a pint, £12", type: "fixed_price", fixedPrice: 12,
        originalValue: 17.5, maxPerWeek: 2, dineInOnly: true, tags: ["food", "midweek"],
        ...when(["tue", "wed"], "17:00", "21:00"),
      },
    ],
  },
  {
    name: "The Bell & Brambles", slug: "bell-brambles", category: "pub", street: "bell", t: 0.75, side: -1,
    houseNumber: "27", phone: "01334 471214", plan: "standard", theme: "plum", pattern: "stripe",
    hours: HOURS.pub,
    reservation: { provider: "website", url: "https://bell-brambles.test/book" },
    loyalty: {
      pointsPerCurrency: 12, pointsPerRedemption: 310, minBasketEarn: 6,
      earnCooldownMinutes: 30, dailyEarnCap: 3, tierWindowDays: 365,
      tiers: [
        { name: "Snug", threshold: 0, multiplier: 1 },
        { name: "Settle", threshold: 550, multiplier: 1.2 },
        { name: "Long Table", threshold: 1100, multiplier: 1.4 },
      ],
      rewards: [
        { name: "Bar snack on the house", costPoints: 600, claimRule: "weekly" },
        { name: "Round of house pints", costPoints: 1600, claimRule: "unlimited" },
        { name: "Long Table booking fee waived", claimRule: "monthly", tier: 2 },
      ],
    },
    offers: [
      {
        title: "15% off the bar bill", shortPromo: "15% off drinks for residents", type: "percentage_discount",
        percentOff: 15, typicalSpend: 26, maxDiscount: 10, tags: ["drinks", "evening"],
        ...when(EVERY_DAY, "16:00", "23:00"),
      },
      {
        title: "Free bowl of chips with two drinks", shortPromo: "Chips on the house with two drinks",
        type: "free_item_with_purchase", itemValue: 4, minBasket: 10, maxPerDay: 1, tags: ["snacks", "weekend"],
        ...when(["thu", "fri", "sat"], "17:00", "21:00"),
      },
    ],
  },
  {
    name: "The Thistle Yett", slug: "thistle-yett", category: "pub", street: "argyle", t: 0.45, side: 1,
    houseNumber: "31", phone: "01334 471326", plan: "free", theme: "ink", pattern: "stripe",
    hours: HOURS.pub,
    offers: [
      {
        title: "10% off food and drink", shortPromo: "10% off, any day", type: "percentage_discount", percentOff: 10,
        typicalSpend: 22, maxDiscount: 6, tags: ["all day", "drinks"],
        ...when(EVERY_DAY),
      },
      {
        title: "Quiz night: two for one on soft drinks", shortPromo: "Two soft drinks for one on quiz night",
        type: "bogo", itemValue: 3.2, maxPerDay: 2, excludesAlcohol: true, tags: ["quiz night", "soft drinks"],
        ...when(["wed"], "19:00", "22:30"),
      },
    ],
  },
  {
    name: "Auld Wynd Tavern", slug: "auld-wynd", category: "pub", street: "market", t: 0.2, side: 1,
    houseNumber: "22", phone: "01334 471438", plan: "standard", theme: "rust", pattern: "wave",
    hours: HOURS.pubLate,
    loyalty: {
      pointsPerCurrency: 10, pointsPerRedemption: 180, minBasketEarn: 0,
      earnCooldownMinutes: 15, dailyEarnCap: 5, tierWindowDays: 180,
      tiers: [
        { name: "Newcomer", threshold: 0, multiplier: 1 },
        { name: "Kent Face", threshold: 350, multiplier: 1.2 },
        { name: "Local Legend", threshold: 900, multiplier: 1.5, discountPercent: 10 },
      ],
      rewards: [
        { name: "House pint", costPoints: 500, claimRule: "monthly" },
        { name: "Toastie and a half pint", costPoints: 1200, claimRule: "unlimited" },
        { name: "Local Legend's dram", claimRule: "weekly", tier: 2 },
      ],
    },
    offers: [
      {
        title: "Off-peak afternoon, 25% off", shortPromo: "25% off between 2pm and 5pm", type: "off_peak",
        percentOff: 25, typicalSpend: 18, maxDiscount: 6, tags: ["quiet hours", "afternoon"],
        ...when(["mon", "tue", "wed", "thu"], "14:00", "17:00"),
      },
      {
        title: "£2 off any cocktail", shortPromo: "£2 off cocktails", type: "fixed_amount_discount", fixedPrice: 2,
        maxPerDay: 2, tags: ["cocktails", "weekend"],
        ...when(["fri", "sat"], "17:00", "23:00"),
      },
      {
        title: "Loyalty dram on the house", shortPromo: "A dram for loyalty members", type: "loyalty_reward",
        itemValue: 6, maxPerWeek: 1, topTierOnly: true, tags: ["loyalty", "whisky"],
        terms: "For Local Legend members. Ask at the bar before you order.",
        ...when(EVERY_DAY, "17:00", "23:00"),
      },
    ],
  },
  {
    name: "The Netmaker's Arms", slug: "netmakers-arms", category: "pub", street: "abbey", t: 0.5, side: -1,
    houseNumber: "11", phone: "01334 471540", plan: "standard", theme: "sea", pattern: "plain",
    hours: HOURS.pub,
    loyalty: {
      pointsPerCurrency: 14, pointsPerRedemption: 290, minBasketEarn: 5,
      earnCooldownMinutes: 45, dailyEarnCap: 2, tierWindowDays: 365,
      tiers: [
        { name: "Float", threshold: 0, multiplier: 1 },
        { name: "Creel", threshold: 550, multiplier: 1.15 },
        { name: "Full Haul", threshold: 1000, multiplier: 1.35 },
      ],
      rewards: [
        { name: "Cup of soup with any pint", costPoints: 650, claimRule: "weekly" },
        { name: "Fish supper for one", costPoints: 1600, claimRule: "unlimited" },
        { name: "Full Haul reserved table", claimRule: "monthly", tier: 2 },
      ],
    },
    offers: [
      {
        title: "18% off Sunday to Wednesday", shortPromo: "18% off early in the week", type: "percentage_discount",
        percentOff: 18, typicalSpend: 21, maxDiscount: 9, tags: ["quiet nights", "food and drink"],
        ...when(["sun", "mon", "tue", "wed"]),
      },
      {
        title: "Two for one on Tuesday pints", shortPromo: "Two pints for one on Tuesdays", type: "bogo",
        itemValue: 5.4, maxPerDay: 1, tags: ["drinks", "tuesday"],
        ...when(["tue"], "17:00", "22:00"),
      },
    ],
  },

  // Cafes ------------------------------------------------------------------
  {
    name: "Bramble & Beam", slug: "bramble-beam", category: "cafe", street: "market", t: 0.45, side: -1,
    houseNumber: "55", phone: "01334 472101", plan: "insight", theme: "sand", pattern: "wave",
    hours: HOURS.cafe,
    loyalty: {
      pointsPerCurrency: 20, pointsPerRedemption: 170, minBasketEarn: 0,
      earnCooldownMinutes: 30, dailyEarnCap: 3, tierWindowDays: 365,
      tiers: [
        { name: "First Cup", threshold: 0, multiplier: 1 },
        { name: "Morning Regular", threshold: 350, multiplier: 1.15 },
        { name: "Barista's Own", threshold: 550, multiplier: 1.35 },
        { name: "House Roast", threshold: 1000, multiplier: 1.5, discountPercent: 15 },
      ],
      rewards: [
        { name: "Any filter coffee", costPoints: 400, claimRule: "weekly" },
        { name: "Coffee and a traybake", costPoints: 900, claimRule: "monthly" },
        { name: "House Roast bag of beans", claimRule: "monthly", tier: 3 },
        { name: "First-visit cinnamon bun", costPoints: 200, claimRule: "once" },
      ],
    },
    offers: [
      {
        title: "20% off before 11am", shortPromo: "20% off the morning rush", type: "off_peak", percentOff: 20,
        typicalSpend: 8.5, maxDiscount: 3, tags: ["breakfast", "coffee", "early"],
        ...when(EVERY_DAY, "07:30", "11:00"),
      },
      {
        title: "Free traybake with any large coffee", shortPromo: "A traybake on the house",
        type: "free_item_with_purchase", itemValue: 3.2, minBasket: 4, maxPerDay: 1, tags: ["coffee", "cake"],
        ...when(WEEKDAYS, "08:00", "16:00"),
      },
      {
        title: "Soup, bread and a coffee for £8", shortPromo: "Lunch set for £8", type: "set_menu", fixedPrice: 8,
        originalValue: 11.4, maxPerDay: 1, tags: ["lunch", "set menu", "vegetarian"],
        ...when(WEEKDAYS, "11:30", "14:30"),
      },
      {
        title: "Loyalty flat white", shortPromo: "A flat white for loyalty members", type: "loyalty_reward",
        itemValue: 3.4, maxPerWeek: 2, topTierOnly: true, tags: ["loyalty", "coffee"],
        terms: "For House Roast members. One a visit, up to twice a week.",
        ...when(EVERY_DAY, "07:30", "16:00"),
      },
    ],
  },
  {
    name: "The Blue Kettle", slug: "blue-kettle", category: "cafe", street: "church", t: 0.4, side: 1,
    houseNumber: "8", phone: "01334 472213", plan: "standard", theme: "sea", pattern: "stripe",
    hours: HOURS.cafe,
    loyalty: {
      pointsPerCurrency: 15, pointsPerRedemption: 70, minBasketEarn: 3,
      earnCooldownMinutes: 60, dailyEarnCap: 2, tierWindowDays: 365,
      tiers: [
        { name: "Kettle On", threshold: 0, multiplier: 1 },
        { name: "Second Pot", threshold: 300, multiplier: 1.1 },
        { name: "Kettle Club", threshold: 900, multiplier: 1.25 },
      ],
      rewards: [
        { name: "Pot of tea", costPoints: 450, claimRule: "monthly" },
        { name: "Scone and jam", costPoints: 800, claimRule: "unlimited" },
        { name: "Kettle Club refill", claimRule: "weekly", tier: 2 },
      ],
    },
    offers: [
      {
        title: "12% off everything", shortPromo: "12% off, all day", type: "percentage_discount", percentOff: 12,
        typicalSpend: 9.2, maxDiscount: 4, tags: ["all day", "tea", "coffee"],
        ...when(EVERY_DAY),
      },
      {
        title: "Two scones for the price of one", shortPromo: "Two scones for one", type: "bogo", itemValue: 3.6,
        maxPerDay: 1, tags: ["baking", "morning"],
        ...when(["mon", "tue", "wed"], "08:00", "11:30"),
      },
    ],
  },
  {
    name: "Ladebraes Coffee House", slug: "ladebraes-coffee", category: "cafe", street: "north", t: 0.25, side: 1,
    houseNumber: "40", phone: "01334 472325", plan: "free", theme: "moss", pattern: "plain",
    hours: HOURS.cafeEarly,
    offers: [
      {
        title: "Coffee and a roll for £5", shortPromo: "Coffee and a roll, £5", type: "fixed_price", fixedPrice: 5,
        originalValue: 7.4, maxPerDay: 1, tags: ["breakfast", "quick"],
        ...when(WEEKDAYS, "07:30", "10:30"),
      },
      {
        title: "10% off any time", shortPromo: "10% off for residents", type: "percentage_discount", percentOff: 10,
        typicalSpend: 7.8, maxDiscount: 3, tags: ["all day", "coffee"],
        ...when(EVERY_DAY),
      },
    ],
  },
  {
    name: "Cardinal Steps Cafe", slug: "cardinal-steps", category: "cafe", street: "scores", t: 0.55, side: -1,
    houseNumber: "17", phone: "01334 472437", plan: "standard", theme: "ink", pattern: "wave",
    hours: HOURS.cafe,
    loyalty: {
      pointsPerCurrency: 15, pointsPerRedemption: 220, minBasketEarn: 3,
      earnCooldownMinutes: 60, dailyEarnCap: 2, tierWindowDays: 365,
      tiers: [
        { name: "Sea Air", threshold: 0, multiplier: 1 },
        { name: "Cliff Path", threshold: 300, multiplier: 1.15 },
        { name: "Lighthouse", threshold: 600, multiplier: 1.3 },
        { name: "Beacon", threshold: 900, multiplier: 1.45, discountPercent: 10 },
      ],
      rewards: [
        { name: "Hot chocolate", costPoints: 500, claimRule: "weekly" },
        { name: "Brunch plate", costPoints: 1200, claimRule: "unlimited" },
        { name: "Beacon members' cake", claimRule: "monthly", tier: 3 },
        { name: "Welcome flat white", costPoints: 250, claimRule: "once" },
      ],
    },
    offers: [
      {
        title: "15% off brunch", shortPromo: "15% off brunch every weekend", type: "percentage_discount",
        percentOff: 15, typicalSpend: 14.5, maxDiscount: 6, tags: ["brunch", "weekend", "sea view"],
        ...when(["sat", "sun"], "09:00", "13:00"),
      },
      {
        title: "Free refill on filter coffee", shortPromo: "Second filter coffee free",
        type: "free_item_with_purchase", itemValue: 2.9, maxPerDay: 1, tags: ["coffee", "all day"],
        ...when(EVERY_DAY, "08:00", "15:00"),
      },
      {
        title: "Afternoon quiet hour, 25% off", shortPromo: "25% off between 3pm and 4pm", type: "off_peak",
        percentOff: 25, typicalSpend: 9, maxDiscount: 4, tags: ["quiet hour", "afternoon"],
        ...when(WEEKDAYS, "15:00", "16:00"),
      },
    ],
  },
  {
    name: "The Wee Pantry", slug: "wee-pantry", category: "cafe", street: "greyfriars", t: 0.5, side: 1,
    houseNumber: "3", phone: "01334 472549", plan: "free", theme: "sand", pattern: "plain",
    hours: HOURS.cafeEarly,
    offers: [
      {
        title: "£1.50 off any breakfast", shortPromo: "£1.50 off breakfast", type: "fixed_amount_discount",
        fixedPrice: 1.5, maxPerDay: 1, tags: ["breakfast", "families"],
        ...when(EVERY_DAY, "08:00", "11:00"),
      },
      {
        title: "Two soups for the price of one", shortPromo: "Two soups for one", type: "bogo", itemValue: 4.8,
        maxPerDay: 1, tags: ["lunch", "soup", "vegetarian"],
        ...when(["mon", "thu"], "11:30", "14:30"),
      },
    ],
  },

  // Bars -------------------------------------------------------------------
  {
    name: "Lamplight Wine Room", slug: "lamplight-wine", category: "bar", street: "south", t: 0.6, side: -1,
    houseNumber: "77", phone: "01334 473103", plan: "standard", theme: "plum", pattern: "plain",
    hours: HOURS.bar,
    reservation: { provider: "resdiary", url: "https://book.lamplight-wine.test" },
    loyalty: {
      pointsPerCurrency: 8, pointsPerRedemption: 260, minBasketEarn: 15,
      earnCooldownMinutes: 60, dailyEarnCap: 2, tierWindowDays: 365,
      tiers: [
        { name: "Glass", threshold: 0, multiplier: 1 },
        { name: "Carafe", threshold: 500, multiplier: 1.2 },
        { name: "Cellar Key", threshold: 900, multiplier: 1.45, discountPercent: 12 },
      ],
      rewards: [
        { name: "Glass of house red or white", costPoints: 700, claimRule: "monthly" },
        { name: "Cheese board for two", costPoints: 1600, claimRule: "unlimited" },
        { name: "Cellar Key tasting pour", claimRule: "weekly", tier: 2 },
      ],
    },
    offers: [
      {
        title: "20% off bottles to drink in", shortPromo: "20% off any bottle", type: "percentage_discount",
        percentOff: 20, typicalSpend: 32, maxDiscount: 15, maxPerWeek: 2, dineInOnly: true,
        tags: ["wine", "evening", "midweek"],
        terms: "One bottle a visit. Not on bin-end bottles.",
        ...when(["sun", "mon", "tue", "wed", "thu"], "17:00", "22:00"),
      },
      {
        title: "Free bar snack with two glasses", shortPromo: "Snack on the house with two glasses",
        type: "free_item_with_purchase", itemValue: 5, minBasket: 12, maxPerDay: 1, tags: ["snacks", "wine"],
        ...when(EVERY_DAY, "17:00", "21:00"),
      },
    ],
  },
  {
    name: "Nineteenth Yard Bar", slug: "nineteenth-yard", category: "bar", street: "cityRoad", t: 0.65, side: -1,
    houseNumber: "24", phone: "01334 473215", plan: "free", theme: "ink", pattern: "stripe",
    hours: HOURS.bar,
    offers: [
      {
        title: "£3 off any cocktail jug", shortPromo: "£3 off cocktail jugs", type: "fixed_amount_discount",
        fixedPrice: 3, maxPerDay: 2, tags: ["cocktails", "groups", "weekend"],
        ...when(["thu", "fri", "sat"], "18:00", "23:00"),
      },
      {
        title: "Early doors, 20% off", shortPromo: "20% off before 7pm", type: "off_peak", percentOff: 20,
        typicalSpend: 19, maxDiscount: 6, tags: ["early evening", "quiet hours"],
        ...when(EVERY_DAY, "16:00", "19:00"),
      },
    ],
  },

  // Takeaways --------------------------------------------------------------
  {
    name: "Harbour Fry", slug: "harbour-fry", category: "takeaway", street: "bridge", t: 0.4, side: 1,
    houseNumber: "5", phone: "01334 474104", plan: "standard", theme: "sea", pattern: "stripe",
    hours: HOURS.takeaway,
    loyalty: {
      pointsPerCurrency: 10, pointsPerRedemption: 90, minBasketEarn: 5,
      earnCooldownMinutes: 90, dailyEarnCap: 2, tierWindowDays: 180,
      tiers: [
        { name: "Single Fish", threshold: 0, multiplier: 1 },
        { name: "Regular Order", threshold: 350, multiplier: 1.1 },
        { name: "Friday Usual", threshold: 900, multiplier: 1.25 },
      ],
      rewards: [
        { name: "Portion of chips", costPoints: 450, claimRule: "monthly" },
        { name: "Fish supper", costPoints: 1000, claimRule: "unlimited" },
        { name: "Friday Usual free can", claimRule: "weekly", tier: 2 },
      ],
    },
    offers: [
      {
        title: "Fish supper for £9", shortPromo: "Fish supper, £9", type: "fixed_price", fixedPrice: 9,
        originalValue: 12.5, maxPerWeek: 3, tags: ["fish and chips", "evening"],
        ...when(EVERY_DAY, "16:30", "21:00"),
      },
      {
        title: "Free can with any supper", shortPromo: "A can on the house", type: "free_item_with_purchase",
        itemValue: 1.4, minBasket: 6, maxPerDay: 1, excludesAlcohol: true, tags: ["drinks", "evening"],
        ...when(EVERY_DAY, "16:30", "21:30"),
      },
      {
        title: "10% off midweek orders", shortPromo: "10% off Monday to Wednesday", type: "percentage_discount",
        percentOff: 10, typicalSpend: 15, maxDiscount: 4, globalUsageLimit: 750, tags: ["midweek", "collection"],
        terms: "Collection only. The offer closes once 750 residents have used it.",
        ...when(["mon", "tue", "wed"]),
      },
    ],
  },
  {
    name: "Spice Lantern Takeaway", slug: "spice-lantern", category: "takeaway", street: "largo", t: 0.35, side: -1,
    houseNumber: "62", phone: "01334 474216", plan: "free", theme: "rust", pattern: "plain",
    hours: HOURS.takeawayLate,
    offers: [
      {
        title: "15% off collection orders", shortPromo: "15% off when you collect", type: "percentage_discount",
        percentOff: 15, typicalSpend: 24, maxDiscount: 8, tags: ["collection", "evening"],
        ...when(EVERY_DAY, "17:00", "22:30"),
      },
      {
        title: "Banquet for two, £26", shortPromo: "Banquet for two, £26", type: "set_menu", fixedPrice: 26,
        originalValue: 35, maxPerWeek: 2, tags: ["set menu", "sharing", "families"],
        menu: {
          heading: "Banquet for two — £26",
          lines: [
            "To start:", "Onion bhaji", "Vegetable pakora", "Poppadoms and chutney",
            "Mains, one each:", "Chicken karahi", "Lamb rogan josh", "Chana masala", "Saag paneer",
            "With:", "Pilau rice", "Naan bread",
          ],
        },
        ...when(["sun", "mon", "tue", "wed"], "17:00", "22:00"),
      },
    ],
  },

  // Hotel ------------------------------------------------------------------
  {
    name: "Windward House Hotel", slug: "windward-house", category: "hotel", street: "scores", t: 0.2, side: 1,
    houseNumber: "4", phone: "01334 475107", plan: "standard", theme: "sand", pattern: "stripe",
    hours: HOURS.hotel,
    reservation: { provider: "website", url: "https://windward-house.test/reservations" },
    loyalty: {
      pointsPerCurrency: 6, pointsPerRedemption: 170, minBasketEarn: 10,
      earnCooldownMinutes: 60, dailyEarnCap: 2, tierWindowDays: 730,
      tiers: [
        { name: "Day Guest", threshold: 0, multiplier: 1 },
        { name: "Weekender", threshold: 250, multiplier: 1.15 },
        { name: "House Resident", threshold: 550, multiplier: 1.3 },
        { name: "Long Stay", threshold: 900, multiplier: 1.5, discountPercent: 10 },
      ],
      rewards: [
        { name: "Afternoon tea for one", costPoints: 500, claimRule: "monthly" },
        { name: "Sunday lunch for two", costPoints: 1500, claimRule: "unlimited" },
        { name: "Long Stay late checkout", claimRule: "monthly", tier: 3 },
        { name: "Welcome drink", costPoints: 150, claimRule: "once" },
      ],
    },
    offers: [
      {
        title: "20% off the lounge menu", shortPromo: "20% off food in the lounge", type: "percentage_discount",
        percentOff: 20, typicalSpend: 28, maxDiscount: 12, excludesAlcohol: true, dineInOnly: true,
        tags: ["lounge", "lunch", "dinner"],
        ...when(EVERY_DAY, "12:00", "21:00"),
      },
      {
        title: "Afternoon tea for £18", shortPromo: "Afternoon tea, £18", type: "fixed_price", fixedPrice: 18,
        originalValue: 26, maxPerWeek: 1, dineInOnly: true, blackout: [CHRISTMAS, GRADUATION],
        tags: ["afternoon tea", "treat"],
        terms: "Booking advised. Twenty-four hours' notice for dietary requirements.",
        ...when(["thu", "fri", "sat", "sun"], "14:00", "17:00"),
      },
      {
        title: "Free coffee with any lunch", shortPromo: "Coffee on the house with lunch",
        type: "free_item_with_purchase", itemValue: 3.5, minBasket: 9, maxPerDay: 1, tags: ["lunch", "coffee"],
        ...when(WEEKDAYS, "12:00", "14:30"),
      },
    ],
  },

  // Retail -----------------------------------------------------------------
  {
    name: "Tolbooth Books", slug: "tolbooth-books", category: "retail", street: "south", t: 0.2, side: 1,
    houseNumber: "31", phone: "01334 476109", plan: "free", theme: "moss", pattern: "wave",
    hours: HOURS.retail,
    offers: [
      {
        title: "10% off every book", shortPromo: "10% off books for residents", type: "percentage_discount",
        percentOff: 10, typicalSpend: 16, maxDiscount: 10, tags: ["books", "all week"],
        terms: "Not on book tokens, magazines or newspapers.",
        ...when(EVERY_DAY),
      },
      {
        title: "Two second-hand books for one", shortPromo: "Two second-hand books for one", type: "bogo",
        itemValue: 4.5, maxPerDay: 1, tags: ["second hand", "weekend"],
        ...when(["sat", "sun"]),
      },
    ],
  },
  {
    name: "Wynd & Willow Gifts", slug: "wynd-willow", category: "retail", street: "market", t: 0.8, side: 1,
    houseNumber: "88", phone: "01334 476211", plan: "free", theme: "plum", pattern: "stripe",
    hours: HOURS.retail,
    offers: [
      {
        title: "£5 off a £30 spend", shortPromo: "£5 off when you spend £30", type: "fixed_amount_discount",
        fixedPrice: 5, minBasket: 30, maxPerWeek: 1, tags: ["gifts", "cards"],
        ...when(EVERY_DAY),
      },
      {
        title: "Quiet Tuesday, 15% off", shortPromo: "15% off on Tuesdays", type: "off_peak", percentOff: 15,
        typicalSpend: 22, maxDiscount: 10, globalUsageLimit: 400, tags: ["quiet day", "gifts"],
        ...when(["tue"], "09:30", "17:00"),
      },
    ],
  },

  // Services ---------------------------------------------------------------
  {
    name: "Turret Lane Barbers", slug: "turret-lane-barbers", category: "services", street: "north", t: 0.8, side: -1,
    houseNumber: "112", phone: "01334 477102", plan: "free", theme: "ink", pattern: "plain",
    hours: HOURS.services,
    offers: [
      {
        title: "Cut for £14 before noon", shortPromo: "Morning cut, £14", type: "fixed_price", fixedPrice: 14,
        originalValue: 19, newCustomerOnly: true, maxLifetime: 1, tags: ["first visit", "morning"],
        terms: "First visit only, for residents who have not used the shop before.",
        ...when(["tue", "wed", "thu"], "09:00", "12:00"),
      },
      {
        title: "10% off any cut", shortPromo: "10% off for residents", type: "percentage_discount", percentOff: 10,
        typicalSpend: 19, maxDiscount: 4, tags: ["all week", "walk-in"],
        ...when(["tue", "wed", "thu", "fri", "sat"]),
      },
    ],
  },

  // Experience -------------------------------------------------------------
  {
    name: "Eastshore Sea Kayak", slug: "eastshore-kayak", category: "experience", street: "bridge", t: 0.75, side: -1,
    houseNumber: "12", phone: "01334 478104", plan: "free", theme: "sea", pattern: "wave",
    hours: HOURS.experience,
    offers: [
      {
        title: "25% off a two-hour paddle", shortPromo: "25% off the two-hour trip", type: "percentage_discount",
        percentOff: 25, typicalSpend: 45, maxDiscount: 15, newCustomerOnly: true, maxLifetime: 1,
        tags: ["first trip", "outdoors", "weekend"],
        terms: "First trip only. Weather dependent; the trip may be moved at short notice.",
        ...when(["fri", "sat", "sun"], "09:00", "17:00"),
      },
      {
        title: "Bring a friend for free", shortPromo: "Two paddlers for the price of one", type: "bogo",
        itemValue: 34, maxPerWeek: 1, tags: ["outdoors", "sharing", "weekend"],
        ...when(["sat", "sun"], "09:00", "16:00"),
      },
    ],
  },
];

/**
 * Sixty invented residents. A Scottish and general-UK mix, because that is what a
 * KY16 membership list actually looks like, and because a list of one flavour of
 * name reads as generated the moment anyone scrolls it.
 */
export const RESIDENT_NAMES: [string, string][] = [
  ["Eilidh", "Ferguson"], ["Callum", "Bryce"], ["Morag", "Sinclair"], ["Douglas", "Rennie"], ["Iona", "Whyte"],
  ["Fraser", "Aitken"], ["Shona", "Kerr"], ["Alasdair", "Ogilvie"], ["Catriona", "Baxter"], ["Rory", "Dunlop"],
  ["Ishbel", "Marr"], ["Hamish", "Lauder"], ["Fiona", "Crombie"], ["Struan", "Nisbet"], ["Kirsty", "Guthrie"],
  ["Ewan", "Halliday"], ["Mairi", "Yule"], ["Angus", "Pringle"], ["Rhona", "Meiklejohn"], ["Lachlan", "Tait"],
  ["Sorcha", "Balfour"], ["Niall", "Sturrock"], ["Isla", "Ramage"], ["Gregor", "Fyfe"], ["Aileen", "Wardrop"],
  ["Murdo", "Cadell"], ["Seonaid", "Lockhart"], ["Torquil", "Braid"], ["Elspeth", "Wemyss"], ["Kenneth", "Strang"],
  ["Priya", "Nayar"], ["Tomasz", "Wojcik"], ["Amara", "Okonkwo"], ["Daniel", "Hollingworth"], ["Ruth", "Pemberton"],
  ["Owain", "Prydderch"], ["Ffion", "Meredith"], ["Sean", "Doherty"], ["Niamh", "Gallagher"], ["Leo", "Marchetti"],
  ["Helen", "Ashworth"], ["Peter", "Brackenbury"], ["Joanna", "Wexford"], ["Michael", "Thirkell"], ["Sarah", "Ingoldsby"],
  ["Yusuf", "Karahan"], ["Ana", "Silveira"], ["Marta", "Kowalczyk"], ["Vikram", "Chandrasekar"], ["Grace", "Amankwah"],
  ["Robert", "Milburn"], ["Alison", "Fairweather"], ["Neil", "Cargill"], ["Jean", "Traquair"], ["Stewart", "Bonnar"],
  ["Lorna", "Kinnear"], ["Ross", "Haddow"], ["Anna", "Petrie"], ["Colin", "Weatherston"], ["Heather", "Muirhead"],
];

/** Real KY16 sectors, so postcode-prefix checks and the map both behave. */
export const RESIDENT_POSTCODES = [
  "KY16 8AA", "KY16 8BQ", "KY16 8DE", "KY16 8LT", "KY16 8NG", "KY16 8RD",
  "KY16 9AL", "KY16 9BT", "KY16 9DU", "KY16 9EG", "KY16 9HL", "KY16 9JX",
  "KY16 9LR", "KY16 9NP", "KY16 9QW", "KY16 9SF", "KY16 9TR", "KY16 9UY",
];

/** Invented residential streets are not needed: real ones with an invented number are enough. */
export const RESIDENT_STREETS = [
  "Lade Braes", "Kinnessburn Road", "Hepburn Gardens", "Nelson Street", "Priory Gardens",
  "Bogward Road", "Windmill Road", "Canongate", "Buchanan Gardens", "Langlands Road",
  "Dempster Terrace", "Irvine Crescent", "Pipeland Road", "Kilrymont Road", "Woodburn Terrace",
];

/** Tier colours by position: slate, sea, bronze, buoy. Four, because some programmes have four tiers. */
export const TIER_COLOURS = ["#7C8A93", "#0F3B47", "#B4762B", "#E4572E"];

/**
 * The shape of a week's trade. Hour weights run from 08:00 to 21:00: cafes peak
 * over breakfast, everywhere that serves an evening peaks between five and nine.
 */
export const HOURS_BY_CATEGORY: Record<string, number[]> = {
  //          8  9 10 11 12 13 14 15 16 17 18 19 20 21
  cafe:      [6, 8, 7, 5, 4, 4, 3, 3, 2, 1, 0, 0, 0, 0],
  restaurant:[0, 0, 0, 1, 3, 3, 1, 1, 1, 5, 8, 8, 5, 2],
  pub:       [0, 0, 0, 1, 2, 2, 2, 2, 3, 6, 8, 8, 6, 3],
  bar:       [0, 0, 0, 0, 1, 1, 1, 1, 2, 5, 7, 8, 7, 4],
  takeaway:  [0, 0, 0, 0, 2, 2, 1, 1, 2, 6, 8, 7, 4, 1],
  hotel:     [1, 1, 2, 3, 5, 4, 3, 3, 3, 4, 5, 5, 3, 1],
  retail:    [1, 3, 5, 6, 6, 5, 5, 4, 3, 1, 0, 0, 0, 0],
  services:  [2, 5, 6, 5, 4, 3, 4, 4, 3, 1, 0, 0, 0, 0],
  experience:[2, 5, 6, 6, 5, 5, 5, 4, 2, 0, 0, 0, 0, 0],
};

/** Monday to Sunday: the back half of the week carries the trade. */
export const DAY_WEIGHTS = [0.7, 0.7, 0.8, 1.1, 1.5, 1.6, 1.1];

/** Redemptions over the six months for a heavy, a middling and an occasional member. */
export const VISITS_BY_BAND = [[95, 140], [16, 30], [4, 12]];
