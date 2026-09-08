// Pure rules for merchant campaigns ("push an offer to residents"). No database access.
//
// The limits here are the product, not a setting. A resident who is pushed at
// eleven at night, or four times in a week, deletes the app and never comes
// back, and the whole scheme depends on residents staying. So the caps live in
// this module, are applied server-side on every send, and no merchant field
// anywhere can move them.

export const CAMPAIGN_AUDIENCES = ["all", "favourites", "past"] as const;
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];

export const CAMPAIGN_STATUSES = ["queued", "sending", "sent", "failed"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Body copy cap. A push notification is truncated by the OS well before this on most phones. */
export const CAMPAIGN_BODY_MAX = 140;
/** One campaign per merchant per seven days. */
export const CAMPAIGN_GAP_DAYS = 7;
/** At most four in a Europe/London calendar month. */
export const CAMPAIGN_MONTHLY_CAP = 4;
/** Nothing sends before 08:00 or at/after 20:00, Europe/London. */
export const CAMPAIGN_WINDOW_START_HOUR = 8;
export const CAMPAIGN_WINDOW_END_HOUR = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
const LONDON = "Europe/London";

// Europe/London wall clock ------------------------------------------------------
//
// A naive UTC hour comparison is wrong for half the year: 20:00 London is 19:00
// UTC in summer and 20:00 UTC in winter, so a "quiet hours" check done in UTC
// would push residents an hour late every summer. Everything below works from
// the formatted London wall clock, the same approach as the Europe/London
// bucketing in server/storage/redemptions.ts and server/lib/loyalty.ts.

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

interface LondonParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function londonParts(d: Date): LondonParts {
  const map: Record<string, string> = {};
  for (const p of partsFormat.formatToParts(d)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** London minus UTC, in minutes, at the given instant. */
function londonOffsetMinutes(d: Date): number {
  const p = londonParts(d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - d.getTime()) / 60000);
}

/**
 * The instant at which the London wall clock reads the given local time. Month
 * and day may overflow (month 13 is January of the next year). Two passes,
 * because the offset that applies depends on the answer.
 */
function londonInstant(year: number, month: number, day: number, hour: number): Date {
  const naive = Date.UTC(year, month - 1, day, hour);
  const first = naive - londonOffsetMinutes(new Date(naive)) * 60000;
  const second = naive - londonOffsetMinutes(new Date(first)) * 60000;
  return new Date(second);
}

/** "YYYY-MM" for the London calendar month an instant falls in. */
export function londonMonthKey(d: Date): string {
  const p = londonParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

/** Whether an instant sits inside the 08:00-20:00 Europe/London sending window. */
export function isWithinSendWindow(at: Date): boolean {
  const hour = londonParts(at).hour;
  return hour >= CAMPAIGN_WINDOW_START_HOUR && hour < CAMPAIGN_WINDOW_END_HOUR;
}

/**
 * The instant a campaign asked for at `at` would actually go out: `at` itself
 * inside the window, otherwise the start of the next window.
 */
export function nextSendWindow(at: Date): Date {
  const p = londonParts(at);
  if (p.hour < CAMPAIGN_WINDOW_START_HOUR) return londonInstant(p.year, p.month, p.day, CAMPAIGN_WINDOW_START_HOUR);
  if (p.hour >= CAMPAIGN_WINDOW_END_HOUR) return londonInstant(p.year, p.month, p.day + 1, CAMPAIGN_WINDOW_START_HOUR);
  return at;
}

/** Start of the London calendar month after the one containing `at`, at 00:00. */
function startOfNextLondonMonth(at: Date): Date {
  const p = londonParts(at);
  return londonInstant(p.year, p.month + 1, 1, 0);
}

/** The only thing the rules need from a stored campaign: when it went, or is due to go. */
export interface CampaignTime {
  /** `sentAt` where it exists, otherwise `scheduledFor`. Queued sends count too. */
  sendAt: Date;
}

export type CampaignBlockReason = "gap" | "monthly_cap";

export interface CampaignPlan {
  /** True when the merchant may create a campaign now (it may still be queued). */
  allowed: boolean;
  /** The instant it would go out. Equals `now` only inside the window with no cap in the way. */
  sendAt: Date;
  /** True when `sendAt` is later than `now`, i.e. it waits for the next window. */
  queued: boolean;
  /** Which limit is in the way; null when allowed. */
  reason: CampaignBlockReason | null;
  /** The earliest instant a campaign could go out, whether or not one is allowed now. */
  nextAllowedAt: Date;
  /** How many have gone out in the London calendar month containing `sendAt`. */
  sentThisMonth: number;
}

/**
 * Given a merchant's campaigns and the current instant, decide whether they may
 * send and when the send would happen. Pure, so the same answer is used by the
 * create endpoint, by the history endpoint's "next send" line and by the tests.
 *
 * A campaign counts against the limits at the time it goes out, not the time it
 * was composed: one queued at 23:00 tonight sends at 08:00 tomorrow and belongs
 * to tomorrow, which is also the day the resident feels it.
 */
export function planCampaign(campaigns: CampaignTime[], now: Date): CampaignPlan {
  const times = campaigns
    .map((c) => c.sendAt)
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const last = times.length > 0 ? times[times.length - 1] : null;

  const earliest = nextSendWindow(now);
  let candidate = earliest;
  let reason: CampaignBlockReason | null = null;

  // Each constraint can push the candidate into territory where the other one
  // bites, so apply them until nothing moves. Two constraints, so this settles
  // quickly; the bound is only there so a bad clock cannot spin.
  for (let pass = 0; pass < 8; pass += 1) {
    if (last) {
      const gapUntil = new Date(last.getTime() + CAMPAIGN_GAP_DAYS * DAY_MS);
      if (candidate.getTime() < gapUntil.getTime()) {
        candidate = nextSendWindow(gapUntil);
        reason = reason ?? "gap";
        continue;
      }
    }
    const month = londonMonthKey(candidate);
    const inMonth = times.filter((t) => londonMonthKey(t) === month).length;
    if (inMonth >= CAMPAIGN_MONTHLY_CAP) {
      candidate = nextSendWindow(startOfNextLondonMonth(candidate));
      reason = "monthly_cap";
      continue;
    }
    break;
  }

  const allowed = candidate.getTime() === earliest.getTime();
  const thisMonth = londonMonthKey(now);
  return {
    allowed,
    sendAt: candidate,
    queued: allowed && candidate.getTime() > now.getTime(),
    reason: allowed ? null : reason,
    nextAllowedAt: candidate,
    // Counted for the month the merchant is looking at, which is the one the
    // "3 of 4 used" line on the composer means.
    sentThisMonth: times.filter((t) => londonMonthKey(t) === thisMonth).length,
  };
}

/** Wording for a 429, so the merchant sees the rule and not a number. */
export function campaignLimitMessage(plan: CampaignPlan): string {
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(plan.nextAllowedAt);
  if (plan.reason === "monthly_cap") {
    return `That is ${CAMPAIGN_MONTHLY_CAP} campaigns this month, which is the limit. You can send again on ${when}.`;
  }
  return `One campaign every ${CAMPAIGN_GAP_DAYS} days. You can send again on ${when}.`;
}

/** Trims and checks body copy. Returns the text to store, or throws nothing — the caller decides. */
export function isValidCampaignBody(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length > 0 && trimmed.length <= CAMPAIGN_BODY_MAX;
}
