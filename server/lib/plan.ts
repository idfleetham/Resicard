// Pure helpers for merchant plans (Free and Premium). No database access.

export type PlanStatus = "free" | "premium";

export interface PlanFeatures {
  unlimitedOffers: boolean;
  loyalty: boolean;
  analytics: boolean;
}

export function isPremium(planStatus: string | null | undefined): boolean {
  return planStatus === "premium";
}

export function planFeatures(planStatus: string | null | undefined): PlanFeatures {
  const premium = isPremium(planStatus);
  return { unlimitedOffers: premium, loyalty: premium, analytics: premium };
}

/**
 * Whether one more offer may go live. Premium is unlimited; Free allows `limit` live
 * (active, non-archived) offers at once.
 */
export function canGoLive(planStatus: string | null | undefined, liveCount: number, limit: number): boolean {
  if (isPremium(planStatus)) return true;
  return liveCount + 1 <= limit;
}

/** How many live offers exceed the Free limit (0 on Premium or when within the limit). */
export function liveOffersOverLimit(planStatus: string | null | undefined, liveCount: number, limit: number): number {
  if (isPremium(planStatus)) return 0;
  return Math.max(0, liveCount - limit);
}

export function planLimitMessage(limit: number): string {
  return `Free plan allows ${limit} live offer${limit === 1 ? "" : "s"}. Upgrade to Premium for more.`;
}

export const PLAN_REQUIRED_MESSAGE = "The loyalty programme is part of Premium.";
