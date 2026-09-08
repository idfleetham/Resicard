import type { OfferType } from "@shared/schema";

/** Shapes returned by GET /api/merchant/campaigns. */

export type CampaignAudience = "all" | "favourites" | "past";
export type CampaignStatus = "queued" | "sending" | "sent" | "failed";

export interface EligibleOffer {
  id: string;
  title: string;
  shortPromo: string | null;
  type: OfferType | null;
  percentOff: number | null;
}

export interface AudienceSize {
  audience: CampaignAudience;
  /** Null when the cohort is too small to report; see `minimum`. */
  size: number | null;
  suppressed: boolean;
  minimum: number;
}

export interface CampaignRow {
  id: string;
  offerId: string;
  offerTitle: string;
  body: string;
  audience: CampaignAudience;
  status: CampaignStatus;
  scheduledFor: string;
  sentAt: string | null;
  recipients: number | null;
  createdAt: string | null;
}

export interface CampaignsResponse {
  allowed: boolean;
  planMessage: string | null;
  pushConfigured: boolean;
  limits: {
    bodyMax: number;
    gapDays: number;
    monthlyCap: number;
    windowStartHour: number;
    windowEndHour: number;
  };
  eligibleOffers: EligibleOffer[];
  audiences: AudienceSize[];
  nextAllowedAt: string;
  canSendNow: boolean;
  blockedReason: "gap" | "monthly_cap" | null;
  sentThisMonth: number;
  campaigns: CampaignRow[];
}

export const AUDIENCE_LABELS: Record<CampaignAudience, string> = {
  all: "Every member",
  favourites: "Members who have starred you",
  past: "Members who have redeemed here",
};

/** "Thursday 11 June, 08:00" in Europe/London, which is the clock the rules use. */
export function londonMoment(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}
