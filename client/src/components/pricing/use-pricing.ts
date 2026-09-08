import { useQuery } from "@tanstack/react-query";
import { trialLengthLabel } from "@/components/resident/format";

/** The shape of GET /api/pricing. Every fee shown to a visitor comes from here. */
export interface Pricing {
  townName: string;
  currency: string;
  freeTrialDays: number;
  resident: { individual: number; household: number };
  merchant: {
    freeLiveOfferLimit: number;
    standardMonthly: number;
    insightMonthly: number;
    /** Alias of standardMonthly, kept for one release. */
    premiumMonthly: number;
  };
}

export const PRICING_KEY = ["/api/pricing"] as const;

export function usePricing() {
  return useQuery<Pricing>({ queryKey: [...PRICING_KEY], staleTime: 5 * 60 * 1000 });
}

/** "three months" style label for the free trial, or null when trials are off. */
export function trialPhrase(days: number): string | null {
  return days > 0 ? trialLengthLabel(days) : null;
}
