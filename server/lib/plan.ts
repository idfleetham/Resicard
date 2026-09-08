// Pure helpers for merchant plans (Free, Standard and Insight). No database access.

export type PlanStatus = "free" | "standard" | "insight";

export interface PlanFeatures {
  unlimitedOffers: boolean;
  loyalty: boolean;
  analytics: boolean;
}

const RANKS: Record<PlanStatus, number> = { free: 0, standard: 1, insight: 2 };

/**
 * Reads a stored plan value. Rows written before the re-cut still hold the legacy
 * "premium", which is what Standard used to be, so it is read as Standard and nothing
 * breaks before a migration runs. Anything else, including null, is Free.
 */
export function normalisePlan(planStatus: string | null | undefined): PlanStatus {
  if (planStatus === "standard" || planStatus === "premium") return "standard";
  if (planStatus === "insight") return "insight";
  return "free";
}

/** Free 0, Standard 1, Insight 2. Every gate is a comparison against this. */
export function planRank(planStatus: string | null | undefined): number {
  return RANKS[normalisePlan(planStatus)];
}

/** The loyalty programme, unlimited offers and the branded card start at Standard. */
export function hasLoyalty(planStatus: string | null | undefined): boolean {
  return planRank(planStatus) >= 1;
}

/** Analytics and town benchmarks are Insight only: their value comes from the network, not the outlet. */
export function hasAnalytics(planStatus: string | null | undefined): boolean {
  return planRank(planStatus) >= 2;
}

export function planFeatures(planStatus: string | null | undefined): PlanFeatures {
  const loyalty = hasLoyalty(planStatus);
  return { unlimitedOffers: loyalty, loyalty, analytics: hasAnalytics(planStatus) };
}

/** The monthly fee for a plan, so the price lives in the config and not in each caller. */
export function planFeeGbp(planStatus: string | null | undefined, fees: { standard: number; insight: number }): number {
  const plan = normalisePlan(planStatus);
  if (plan === "insight") return fees.insight;
  if (plan === "standard") return fees.standard;
  return 0;
}

/**
 * Whether one more offer may go live. A paid plan is unlimited; Free allows `limit` live
 * (active, non-archived) offers at once.
 */
export function canGoLive(planStatus: string | null | undefined, liveCount: number, limit: number): boolean {
  if (hasLoyalty(planStatus)) return true;
  return liveCount + 1 <= limit;
}

/** How many live offers exceed the Free limit (0 on a paid plan or when within the limit). */
export function liveOffersOverLimit(planStatus: string | null | undefined, liveCount: number, limit: number): number {
  if (hasLoyalty(planStatus)) return 0;
  return Math.max(0, liveCount - limit);
}

export function planLimitMessage(limit: number): string {
  return `Free plan allows ${limit} live offer${limit === 1 ? "" : "s"}. Standard and Insight have no limit.`;
}

export const PLAN_REQUIRED_MESSAGE = "The loyalty programme is part of Standard and Insight.";

export const ANALYTICS_PLAN_REQUIRED_MESSAGE = "Analytics are part of Insight.";
