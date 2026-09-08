import type { CardPattern, CardTheme, MERCHANT_CATEGORIES, OfferType } from "@shared/schema";

/**
 * The invented town behind `npm run seed:demo`.
 *
 * Every outlet name here is made up. Real St Andrews street names, postcodes and
 * coordinates are used on purpose, because a demo map is only convincing if the
 * pins sit on real streets — but attaching an invented offer to a real trader's
 * name would misrepresent a business that never agreed to any of it, and in a
 * town this size that would be noticed. Invented name, real address.
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
  /** Three tier names, sector-appropriate and not reused between outlets. */
  tiers?: [string, string, string];
  /** True when the top tier carries a flat discount on the card. */
  topTierDiscount?: number;
  rewards?: [string, string];
  offers: DemoOffer[];
}

export const OUTLETS: DemoOutlet[] = [
  // Restaurants ------------------------------------------------------------
  {
    name: "The Harrow & Herring", slug: "harrow-herring", category: "restaurant", street: "south", t: 0.35, side: 1,
    houseNumber: "48", phone: "01334 470118", plan: "insight", theme: "sea", pattern: "wave",
    tiers: ["Deckhand", "Skipper", "Harbourmaster"], topTierDiscount: 12, rewards: ["Free dessert of the day", "Bottle of house wine"],
    offers: [
      { title: "15% off the a la carte menu", shortPromo: "15% off food, Sunday to Thursday", type: "percentage_discount", percentOff: 15, typicalSpend: 44, ...when(["sun", "mon", "tue", "wed", "thu"]) },
      { title: "Two-course residents' menu", shortPromo: "Two courses for £22", type: "set_menu", fixedPrice: 22, originalValue: 31, ...when(WEEKDAYS, "17:00", "19:00") },
      { title: "Free glass of fizz with two mains", shortPromo: "A glass on the house with two mains", type: "free_item_with_purchase", itemValue: 7.5, ...when(["fri", "sat"], "17:00", "21:30") },
    ],
  },
  {
    name: "Kinnaird Table", slug: "kinnaird-table", category: "restaurant", street: "market", t: 0.62, side: -1,
    houseNumber: "71", phone: "01334 470224", plan: "standard", theme: "ink", pattern: "plain",
    tiers: ["Regular", "Table Holder", "House Guest"], rewards: ["Coffee and petit fours", "Chef's starter to share"],
    offers: [
      { title: "£10 off a bill over £50", shortPromo: "£10 off when you spend £50", type: "fixed_amount_discount", fixedPrice: 10, ...when(EVERY_DAY) },
      { title: "Early table, three courses", shortPromo: "Three courses for £26 before 7pm", type: "set_menu", fixedPrice: 26, originalValue: 38, ...when(["tue", "wed", "thu"], "17:30", "19:00") },
    ],
  },
  {
    name: "Saltgrass Kitchen", slug: "saltgrass-kitchen", category: "restaurant", street: "bell", t: 0.4, side: 1,
    houseNumber: "14", phone: "01334 470336", plan: "standard", theme: "moss", pattern: "stripe",
    tiers: ["Sprout", "Grower", "Head Gardener"], topTierDiscount: 10, rewards: ["Side dish on the house", "Sunday lunch for one"],
    offers: [
      { title: "20% off Monday and Tuesday dinner", shortPromo: "20% off dinner at the start of the week", type: "percentage_discount", percentOff: 20, typicalSpend: 36, ...when(["mon", "tue"], "17:00", "21:00") },
      { title: "Two for one on small plates", shortPromo: "Two small plates for the price of one", type: "bogo", itemValue: 8.5, ...when(["wed", "thu"], "17:00", "20:00") },
      { title: "Weekday lunch bowl", shortPromo: "Any lunch bowl for £9", type: "fixed_price", fixedPrice: 9, originalValue: 13.5, ...when(WEEKDAYS, "12:00", "14:30") },
    ],
  },
  {
    name: "The Copper Quay", slug: "copper-quay", category: "restaurant", street: "north", t: 0.55, side: -1,
    houseNumber: "93", phone: "01334 470447", plan: "free", theme: "rust", pattern: "plain",
    offers: [
      { title: "10% off every visit", shortPromo: "10% off food for residents", type: "percentage_discount", percentOff: 10, typicalSpend: 38, ...when(EVERY_DAY) },
      { title: "Free side with any main", shortPromo: "A side on the house with any main", type: "free_item_with_purchase", itemValue: 4.5, ...when(EVERY_DAY, "12:00", "21:00") },
    ],
  },
  {
    name: "Braeburn Dining Room", slug: "braeburn-dining", category: "restaurant", street: "cityRoad", t: 0.3, side: 1,
    houseNumber: "9", phone: "01334 470559", plan: "standard", theme: "plum", pattern: "wave",
    tiers: ["Orchard", "Blossom", "First Pressing"], rewards: ["Aperitif on arrival", "Cheese course for two"],
    offers: [
      { title: "Sunday roast for £16", shortPromo: "Roast of the day, £16", type: "fixed_price", fixedPrice: 16, originalValue: 22, ...when(["sun"], "12:00", "16:00") },
      { title: "12% off Wednesday to Friday", shortPromo: "12% off midweek dinner", type: "percentage_discount", percentOff: 12, typicalSpend: 41, ...when(["wed", "thu", "fri"], "17:00", "21:30") },
    ],
  },

  // Pubs -------------------------------------------------------------------
  {
    name: "The Gowfer's Rest", slug: "gowfers-rest", category: "pub", street: "golfPlace", t: 0.35, side: 1,
    houseNumber: "6", phone: "01334 471102", plan: "insight", theme: "moss", pattern: "plain",
    tiers: ["Caddie", "Club Member", "Course Record"], topTierDiscount: 15, rewards: ["Pint of the week", "Whisky of the month dram"],
    offers: [
      { title: "£1 off every pint", shortPromo: "£1 off pints, all week", type: "fixed_amount_discount", fixedPrice: 1, ...when(EVERY_DAY) },
      { title: "Two for one on house drams", shortPromo: "Two drams for the price of one", type: "bogo", itemValue: 5.2, ...when(["thu", "fri"], "17:00", "21:00") },
      { title: "Off-peak Monday, 20% off", shortPromo: "20% off the whole bill on Mondays", type: "off_peak", percentOff: 20, typicalSpend: 24, ...when(["mon"], "16:00", "22:00") },
      { title: "Pie and a pint for £12", shortPromo: "Pie and a pint, £12", type: "fixed_price", fixedPrice: 12, originalValue: 17.5, ...when(["tue", "wed"], "17:00", "21:00") },
    ],
  },
  {
    name: "The Bell & Brambles", slug: "bell-brambles", category: "pub", street: "bell", t: 0.75, side: -1,
    houseNumber: "27", phone: "01334 471214", plan: "standard", theme: "plum", pattern: "stripe",
    tiers: ["Snug", "Settle", "Long Table"], rewards: ["Bar snack on the house", "Round of house pints"],
    offers: [
      { title: "15% off the bar bill", shortPromo: "15% off drinks for residents", type: "percentage_discount", percentOff: 15, typicalSpend: 26, ...when(EVERY_DAY, "16:00", "23:00") },
      { title: "Free bowl of chips with two drinks", shortPromo: "Chips on the house with two drinks", type: "free_item_with_purchase", itemValue: 4, ...when(["thu", "fri", "sat"], "17:00", "21:00") },
    ],
  },
  {
    name: "The Thistle Yett", slug: "thistle-yett", category: "pub", street: "argyle", t: 0.45, side: 1,
    houseNumber: "31", phone: "01334 471326", plan: "free", theme: "ink", pattern: "stripe",
    offers: [
      { title: "10% off food and drink", shortPromo: "10% off, any day", type: "percentage_discount", percentOff: 10, typicalSpend: 22, ...when(EVERY_DAY) },
      { title: "Quiz night: two for one on soft drinks", shortPromo: "Two soft drinks for one on quiz night", type: "bogo", itemValue: 3.2, ...when(["wed"], "19:00", "22:30") },
    ],
  },
  {
    name: "Auld Wynd Tavern", slug: "auld-wynd", category: "pub", street: "market", t: 0.2, side: 1,
    houseNumber: "22", phone: "01334 471438", plan: "standard", theme: "rust", pattern: "wave",
    tiers: ["Newcomer", "Kent Face", "Local Legend"], topTierDiscount: 10, rewards: ["House pint", "Toastie and a half pint"],
    offers: [
      { title: "Off-peak afternoon, 25% off", shortPromo: "25% off between 2pm and 5pm", type: "off_peak", percentOff: 25, typicalSpend: 18, ...when(["mon", "tue", "wed", "thu"], "14:00", "17:00") },
      { title: "£2 off any cocktail", shortPromo: "£2 off cocktails", type: "fixed_amount_discount", fixedPrice: 2, ...when(["fri", "sat"], "17:00", "23:00") },
      { title: "Loyalty dram on the house", shortPromo: "A dram for loyalty members", type: "loyalty_reward", itemValue: 6, ...when(EVERY_DAY, "17:00", "23:00") },
    ],
  },
  {
    name: "The Netmaker's Arms", slug: "netmakers-arms", category: "pub", street: "abbey", t: 0.5, side: -1,
    houseNumber: "11", phone: "01334 471540", plan: "standard", theme: "sea", pattern: "plain",
    tiers: ["Float", "Creel", "Full Haul"], rewards: ["Cup of soup with any pint", "Fish supper for one"],
    offers: [
      { title: "18% off Sunday to Wednesday", shortPromo: "18% off early in the week", type: "percentage_discount", percentOff: 18, typicalSpend: 21, ...when(["sun", "mon", "tue", "wed"]) },
      { title: "Two for one on Tuesday pints", shortPromo: "Two pints for one on Tuesdays", type: "bogo", itemValue: 5.4, ...when(["tue"], "17:00", "22:00") },
    ],
  },

  // Cafes ------------------------------------------------------------------
  {
    name: "Bramble & Beam", slug: "bramble-beam", category: "cafe", street: "market", t: 0.45, side: -1,
    houseNumber: "55", phone: "01334 472101", plan: "insight", theme: "sand", pattern: "wave",
    tiers: ["First Cup", "Morning Regular", "Barista's Own"], topTierDiscount: 15, rewards: ["Any filter coffee", "Coffee and a traybake"],
    offers: [
      { title: "20% off before 11am", shortPromo: "20% off the morning rush", type: "off_peak", percentOff: 20, typicalSpend: 8.5, ...when(EVERY_DAY, "07:30", "11:00") },
      { title: "Free traybake with any large coffee", shortPromo: "A traybake on the house", type: "free_item_with_purchase", itemValue: 3.2, ...when(WEEKDAYS, "08:00", "16:00") },
      { title: "Soup, bread and a coffee for £8", shortPromo: "Lunch set for £8", type: "set_menu", fixedPrice: 8, originalValue: 11.4, ...when(WEEKDAYS, "11:30", "14:30") },
      { title: "Loyalty flat white", shortPromo: "A flat white for loyalty members", type: "loyalty_reward", itemValue: 3.4, ...when(EVERY_DAY, "07:30", "16:00") },
    ],
  },
  {
    name: "The Blue Kettle", slug: "blue-kettle", category: "cafe", street: "church", t: 0.4, side: 1,
    houseNumber: "8", phone: "01334 472213", plan: "standard", theme: "sea", pattern: "stripe",
    tiers: ["Kettle On", "Second Pot", "Kettle Club"], rewards: ["Pot of tea", "Scone and jam"],
    offers: [
      { title: "12% off everything", shortPromo: "12% off, all day", type: "percentage_discount", percentOff: 12, typicalSpend: 9.2, ...when(EVERY_DAY) },
      { title: "Two scones for the price of one", shortPromo: "Two scones for one", type: "bogo", itemValue: 3.6, ...when(["mon", "tue", "wed"], "08:00", "11:30") },
    ],
  },
  {
    name: "Ladebraes Coffee House", slug: "ladebraes-coffee", category: "cafe", street: "north", t: 0.25, side: 1,
    houseNumber: "40", phone: "01334 472325", plan: "free", theme: "moss", pattern: "plain",
    offers: [
      { title: "Coffee and a roll for £5", shortPromo: "Coffee and a roll, £5", type: "fixed_price", fixedPrice: 5, originalValue: 7.4, ...when(WEEKDAYS, "07:30", "10:30") },
      { title: "10% off any time", shortPromo: "10% off for residents", type: "percentage_discount", percentOff: 10, typicalSpend: 7.8, ...when(EVERY_DAY) },
    ],
  },
  {
    name: "Cardinal Steps Cafe", slug: "cardinal-steps", category: "cafe", street: "scores", t: 0.55, side: -1,
    houseNumber: "17", phone: "01334 472437", plan: "standard", theme: "ink", pattern: "wave",
    tiers: ["Sea Air", "Cliff Path", "Lighthouse"], topTierDiscount: 10, rewards: ["Hot chocolate", "Brunch plate"],
    offers: [
      { title: "15% off brunch", shortPromo: "15% off brunch every weekend", type: "percentage_discount", percentOff: 15, typicalSpend: 14.5, ...when(["sat", "sun"], "09:00", "13:00") },
      { title: "Free refill on filter coffee", shortPromo: "Second filter coffee free", type: "free_item_with_purchase", itemValue: 2.9, ...when(EVERY_DAY, "08:00", "15:00") },
      { title: "Afternoon quiet hour, 25% off", shortPromo: "25% off between 3pm and 4pm", type: "off_peak", percentOff: 25, typicalSpend: 9, ...when(WEEKDAYS, "15:00", "16:00") },
    ],
  },
  {
    name: "The Wee Pantry", slug: "wee-pantry", category: "cafe", street: "greyfriars", t: 0.5, side: 1,
    houseNumber: "3", phone: "01334 472549", plan: "free", theme: "sand", pattern: "plain",
    offers: [
      { title: "£1.50 off any breakfast", shortPromo: "£1.50 off breakfast", type: "fixed_amount_discount", fixedPrice: 1.5, ...when(EVERY_DAY, "08:00", "11:00") },
      { title: "Two soups for the price of one", shortPromo: "Two soups for one", type: "bogo", itemValue: 4.8, ...when(["mon", "thu"], "11:30", "14:30") },
    ],
  },

  // Bars -------------------------------------------------------------------
  {
    name: "Lamplight Wine Room", slug: "lamplight-wine", category: "bar", street: "south", t: 0.6, side: -1,
    houseNumber: "77", phone: "01334 473103", plan: "standard", theme: "plum", pattern: "plain",
    tiers: ["Glass", "Carafe", "Cellar Key"], topTierDiscount: 12, rewards: ["Glass of house red or white", "Cheese board for two"],
    offers: [
      { title: "20% off bottles to drink in", shortPromo: "20% off any bottle", type: "percentage_discount", percentOff: 20, typicalSpend: 32, ...when(["sun", "mon", "tue", "wed", "thu"], "17:00", "22:00") },
      { title: "Free bar snack with two glasses", shortPromo: "Snack on the house with two glasses", type: "free_item_with_purchase", itemValue: 5, ...when(EVERY_DAY, "17:00", "21:00") },
    ],
  },
  {
    name: "Nineteenth Yard Bar", slug: "nineteenth-yard", category: "bar", street: "cityRoad", t: 0.65, side: -1,
    houseNumber: "24", phone: "01334 473215", plan: "free", theme: "ink", pattern: "stripe",
    offers: [
      { title: "£3 off any cocktail jug", shortPromo: "£3 off cocktail jugs", type: "fixed_amount_discount", fixedPrice: 3, ...when(["thu", "fri", "sat"], "18:00", "23:00") },
      { title: "Early doors, 20% off", shortPromo: "20% off before 7pm", type: "off_peak", percentOff: 20, typicalSpend: 19, ...when(EVERY_DAY, "16:00", "19:00") },
    ],
  },

  // Takeaways --------------------------------------------------------------
  {
    name: "Harbour Fry", slug: "harbour-fry", category: "takeaway", street: "bridge", t: 0.4, side: 1,
    houseNumber: "5", phone: "01334 474104", plan: "standard", theme: "sea", pattern: "stripe",
    tiers: ["Single Fish", "Regular Order", "Friday Usual"], rewards: ["Portion of chips", "Fish supper"],
    offers: [
      { title: "Fish supper for £9", shortPromo: "Fish supper, £9", type: "fixed_price", fixedPrice: 9, originalValue: 12.5, ...when(EVERY_DAY, "16:30", "21:00") },
      { title: "Free can with any supper", shortPromo: "A can on the house", type: "free_item_with_purchase", itemValue: 1.4, ...when(EVERY_DAY, "16:30", "21:30") },
      { title: "10% off midweek orders", shortPromo: "10% off Monday to Wednesday", type: "percentage_discount", percentOff: 10, typicalSpend: 15, ...when(["mon", "tue", "wed"]) },
    ],
  },
  {
    name: "Spice Lantern Takeaway", slug: "spice-lantern", category: "takeaway", street: "largo", t: 0.35, side: -1,
    houseNumber: "62", phone: "01334 474216", plan: "free", theme: "rust", pattern: "plain",
    offers: [
      { title: "15% off collection orders", shortPromo: "15% off when you collect", type: "percentage_discount", percentOff: 15, typicalSpend: 24, ...when(EVERY_DAY, "17:00", "22:30") },
      { title: "Banquet for two, £26", shortPromo: "Banquet for two, £26", type: "set_menu", fixedPrice: 26, originalValue: 35, ...when(["sun", "mon", "tue", "wed"], "17:00", "22:00") },
    ],
  },

  // Hotel ------------------------------------------------------------------
  {
    name: "Windward House Hotel", slug: "windward-house", category: "hotel", street: "scores", t: 0.2, side: 1,
    houseNumber: "4", phone: "01334 475107", plan: "standard", theme: "sand", pattern: "stripe",
    tiers: ["Day Guest", "Weekender", "House Resident"], topTierDiscount: 10, rewards: ["Afternoon tea for one", "Sunday lunch for two"],
    offers: [
      { title: "20% off the lounge menu", shortPromo: "20% off food in the lounge", type: "percentage_discount", percentOff: 20, typicalSpend: 28, ...when(EVERY_DAY, "12:00", "21:00") },
      { title: "Afternoon tea for £18", shortPromo: "Afternoon tea, £18", type: "fixed_price", fixedPrice: 18, originalValue: 26, ...when(["thu", "fri", "sat", "sun"], "14:00", "17:00") },
      { title: "Free coffee with any lunch", shortPromo: "Coffee on the house with lunch", type: "free_item_with_purchase", itemValue: 3.5, ...when(WEEKDAYS, "12:00", "14:30") },
    ],
  },

  // Retail -----------------------------------------------------------------
  {
    name: "Tolbooth Books", slug: "tolbooth-books", category: "retail", street: "south", t: 0.2, side: 1,
    houseNumber: "31", phone: "01334 476109", plan: "free", theme: "moss", pattern: "wave",
    offers: [
      { title: "10% off every book", shortPromo: "10% off books for residents", type: "percentage_discount", percentOff: 10, typicalSpend: 16, ...when(EVERY_DAY) },
      { title: "Two second-hand books for one", shortPromo: "Two second-hand books for one", type: "bogo", itemValue: 4.5, ...when(["sat", "sun"]) },
    ],
  },
  {
    name: "Wynd & Willow Gifts", slug: "wynd-willow", category: "retail", street: "market", t: 0.8, side: 1,
    houseNumber: "88", phone: "01334 476211", plan: "free", theme: "plum", pattern: "stripe",
    offers: [
      { title: "£5 off a £30 spend", shortPromo: "£5 off when you spend £30", type: "fixed_amount_discount", fixedPrice: 5, ...when(EVERY_DAY) },
      { title: "Quiet Tuesday, 15% off", shortPromo: "15% off on Tuesdays", type: "off_peak", percentOff: 15, typicalSpend: 22, ...when(["tue"], "09:30", "17:00") },
    ],
  },

  // Services ---------------------------------------------------------------
  {
    name: "Turret Lane Barbers", slug: "turret-lane-barbers", category: "services", street: "north", t: 0.8, side: -1,
    houseNumber: "112", phone: "01334 477102", plan: "free", theme: "ink", pattern: "plain",
    offers: [
      { title: "Cut for £14 before noon", shortPromo: "Morning cut, £14", type: "fixed_price", fixedPrice: 14, originalValue: 19, ...when(["tue", "wed", "thu"], "09:00", "12:00") },
      { title: "10% off any cut", shortPromo: "10% off for residents", type: "percentage_discount", percentOff: 10, typicalSpend: 19, ...when(["tue", "wed", "thu", "fri", "sat"]) },
    ],
  },

  // Experience -------------------------------------------------------------
  {
    name: "Eastshore Sea Kayak", slug: "eastshore-kayak", category: "experience", street: "bridge", t: 0.75, side: -1,
    houseNumber: "12", phone: "01334 478104", plan: "free", theme: "sea", pattern: "wave",
    offers: [
      { title: "25% off a two-hour paddle", shortPromo: "25% off the two-hour trip", type: "percentage_discount", percentOff: 25, typicalSpend: 45, ...when(["fri", "sat", "sun"], "09:00", "17:00") },
      { title: "Bring a friend for free", shortPromo: "Two paddlers for the price of one", type: "bogo", itemValue: 34, ...when(["sat", "sun"], "09:00", "16:00") },
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

/** The three tier thresholds and colours every seeded programme uses. */
export const TIER_THRESHOLDS = [0, 300, 900];
export const TIER_COLOURS = ["#7C8A93", "#0F3B47", "#B4762B"];

export const BUSINESS_HOURS = JSON.stringify({
  mon: { open: "09:00", close: "22:00" }, tue: { open: "09:00", close: "22:00" },
  wed: { open: "09:00", close: "22:00" }, thu: { open: "09:00", close: "23:00" },
  fri: { open: "09:00", close: "23:30" }, sat: { open: "09:00", close: "23:30" },
  sun: { open: "10:00", close: "22:00" },
});

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

