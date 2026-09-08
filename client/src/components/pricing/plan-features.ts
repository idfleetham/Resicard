import type { ComparisonRow } from "./comparison-table";

/**
 * One source of truth for what each plan actually includes today, shared by the
 * public pricing page, the merchant plan tab and the resident reminder, so the two
 * cannot drift. Nothing here is a claim about the future.
 */

export type MerchantPlanKey = "free" | "standard" | "insight";

export const MERCHANT_PLAN_NAMES: Record<MerchantPlanKey, string> = {
  free: "Free",
  standard: "Standard",
  insight: "Insight",
};

/**
 * Reads a plan value from the API. Rows written before the three tiers still hold the
 * legacy "premium", which is what Standard used to be, so it reads as Standard.
 */
export function normalisePlanKey(value: string | null | undefined): MerchantPlanKey {
  if (value === "standard" || value === "premium") return "standard";
  if (value === "insight") return "insight";
  return "free";
}

export function liveOfferLimitLabel(limit: number): string {
  return `Up to ${limit} live offer${limit === 1 ? "" : "s"} at a time`;
}

// Residents ------------------------------------------------------------------

/** What a Free resident actually has. Points and tiers are not here: they only move on a redemption. */
export const RESIDENT_FREE_FEATURES = [
  "Browse every offer and see what it is worth",
  "Find and favourite outlets",
  "See each outlet's loyalty card and what its tiers are worth",
];

/** What paying adds. Everything below depends on being able to redeem, which is why it sits here. */
export const RESIDENT_PREMIUM_FEATURES = [
  "The verified Resicard",
  "Redeem offers",
  "Earn points and tier status",
  "Claim tier benefits and rewards",
  "Flat tier discounts on the loyalty card",
  "The savings tracker",
  "Household cover",
];

export function residentRows(): ComparisonRow[] {
  return [
    ...RESIDENT_FREE_FEATURES.map((feature) => ({ feature, values: [true, true] })),
    ...RESIDENT_PREMIUM_FEATURES.map((feature) => ({ feature, values: [false, true] })),
  ];
}

// Businesses -----------------------------------------------------------------

/** The listing every business gets, with the Free live offer cap spelled out. */
export function merchantFreeFeatures(limit: number): string[] {
  return [
    "Listing in the residents' app",
    "The printed QR poster",
    "Day and time scheduling",
    "Redemption feed, counts and favourites",
    liveOfferLimitLabel(limit),
  ];
}

export const MERCHANT_STANDARD_FEATURES = [
  "Everything in Free, with no limit on live offers",
  "The loyalty programme: points, tiers, rewards and the till tool",
  "Your branded loyalty card and tier-only offers",
];

export const MERCHANT_INSIGHT_FEATURES = [
  "Everything in Standard",
  "Analytics: who comes in, when, and which offers they use",
  "Town benchmarks against outlets like yours",
];

/**
 * The business table. Three columns in the order Free, Standard, Insight, with the
 * live offer row carrying a figure rather than a tick.
 */
export function merchantRows(limit: number): ComparisonRow[] {
  const unlimited = "Unlimited";
  return [
    { feature: "Listing, QR poster and scheduling", values: [true, true, true] },
    { feature: "Live offers", values: [String(limit), unlimited, unlimited] },
    { feature: "Redemption feed, counts and favourites", values: [true, true, true] },
    { feature: "Loyalty programme: points, tiers, rewards and the till tool", values: [false, true, true] },
    { feature: "Branded loyalty card and tier-only offers", values: [false, true, true] },
    { feature: "Analytics", values: [false, false, true] },
    { feature: "Town benchmarks", values: [false, false, true] },
  ];
}
