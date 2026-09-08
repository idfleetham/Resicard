import type { LoyaltyProgram, LoyaltyTier, LoyaltyBalance, LoyaltyReward } from "@shared/schema";
import type { DbClient } from "../storage/types";
import { db } from "../db";
import * as loyaltyStore from "../storage/loyalty";
import { pointsForRedemption } from "./offer-rules";

export const DEFAULT_TIER_WINDOW_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const LONDON = "Europe/London";

// Pure helpers -----------------------------------------------------------------

export interface TierLike {
  id: string;
  thresholdPoints: number;
  sortOrder?: number | null;
}

export interface TierStatus<T extends TierLike> {
  tier: T | null;
  nextTier: T | null;
}

/**
 * The tier a resident holds on `statusPoints` (points earned in the rolling
 * window): the highest tier whose threshold is at or below them, plus the next
 * tier up. Pure.
 */
export function resolveStatus<T extends TierLike>(tiers: T[], statusPoints: number): TierStatus<T> {
  let tier: T | null = null;
  let next: T | null = null;
  for (const t of tiers) {
    if (t.thresholdPoints <= statusPoints) {
      if (!tier || t.thresholdPoints > tier.thresholdPoints || (t.thresholdPoints === tier.thresholdPoints && (t.sortOrder ?? 0) > (tier.sortOrder ?? 0))) tier = t;
    } else if (!next || t.thresholdPoints < next.thresholdPoints) {
      next = t;
    }
  }
  return { tier, nextTier: next };
}

/** Tier ordering: threshold first, then sortOrder. */
function tierRank(t: TierLike): [number, number] {
  return [t.thresholdPoints, t.sortOrder ?? 0];
}

function atOrAbove(held: TierLike, required: TierLike): boolean {
  const [ht, hs] = tierRank(held);
  const [rt, rs] = tierRank(required);
  return ht > rt || (ht === rt && hs >= rs);
}

interface LondonParts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 1 = Monday ... 7 = Sunday
}

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function londonParts(d: Date): LondonParts & { hour: number; minute: number; second: number } {
  const map: Record<string, string> = {};
  for (const p of partsFormat.formatToParts(d)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: WEEKDAYS[map.weekday] ?? 1,
    hour: Number(map.hour),
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

/** The instant of midnight in London on the given calendar day (month is 1-12; day may overflow). */
function londonMidnight(year: number, month: number, day: number): Date {
  const naive = Date.UTC(year, month - 1, day);
  let result = naive - londonOffsetMinutes(new Date(naive)) * 60000;
  const offsetAtResult = londonOffsetMinutes(new Date(result));
  if (result !== naive - offsetAtResult * 60000) result = naive - offsetAtResult * 60000;
  return new Date(result);
}

/** Start of the calendar week (Monday 00:00, Europe/London) containing `now`. */
export function weekStart(now: Date): Date {
  const p = londonParts(now);
  return londonMidnight(p.year, p.month, p.day - (p.weekday - 1));
}

/** Start of the calendar month (Europe/London) containing `now`. */
export function monthStart(now: Date): Date {
  const p = londonParts(now);
  return londonMidnight(p.year, p.month, 1);
}

function nextWeekStart(now: Date): Date {
  const p = londonParts(now);
  return londonMidnight(p.year, p.month, p.day - (p.weekday - 1) + 7);
}

function nextMonthStart(now: Date): Date {
  const p = londonParts(now);
  return londonMidnight(p.year, p.month + 1, 1);
}

export interface ClaimCheck {
  ok: boolean;
  /** Why the claim is blocked; null when ok. */
  reason: string | null;
  /** When the resident may claim again, for weekly/monthly rules; null otherwise. */
  nextClaimAt: Date | null;
  /** True when the block is a tier entitlement problem (403) rather than a claim-rule one (400). */
  entitled: boolean;
}

type RewardLike = Pick<LoyaltyReward, "tierId" | "claimRule">;

/**
 * Whether the resident may claim a reward now: entitled by tier (no tierId, or
 * their tier at or above the reward's tier) and within the claimRule window,
 * measured on the Europe/London calendar. Pure.
 */
export function canClaim<T extends TierLike>(
  reward: RewardLike,
  tier: T | null,
  tiers: T[],
  lastClaimAt: Date | null,
  now: Date = new Date(),
): ClaimCheck {
  if (reward.tierId) {
    const required = tiers.find((t) => t.id === reward.tierId);
    if (!required || !tier || !atOrAbove(tier, required)) {
      return { ok: false, reason: "This benefit is for members of a higher tier", nextClaimAt: null, entitled: false };
    }
  }
  const rule = reward.claimRule ?? "unlimited";
  if (rule === "unlimited" || !lastClaimAt) return { ok: true, reason: null, nextClaimAt: null, entitled: true };
  if (rule === "once") return { ok: false, reason: "Already claimed", nextClaimAt: null, entitled: true };
  if (rule === "weekly" && lastClaimAt.getTime() >= weekStart(now).getTime()) {
    return { ok: false, reason: "Already claimed this week", nextClaimAt: nextWeekStart(now), entitled: true };
  }
  if (rule === "monthly" && lastClaimAt.getTime() >= monthStart(now).getTime()) {
    return { ok: false, reason: "Already claimed this month", nextClaimAt: nextMonthStart(now), entitled: true };
  }
  return { ok: true, reason: null, nextClaimAt: null, entitled: true };
}

/** A tier benefit is a reward limited to a tier that costs nothing. */
export function isTierBenefit(reward: Pick<LoyaltyReward, "tierId" | "costPoints" | "costStamps">): boolean {
  return Boolean(reward.tierId) && !(reward.costPoints ?? 0) && !(reward.costStamps ?? 0);
}

// Status (rolling tier) --------------------------------------------------------

export function tierWindowDaysOf(program: Pick<LoyaltyProgram, "tierWindowDays">): number {
  return program.tierWindowDays ?? DEFAULT_TIER_WINDOW_DAYS;
}

/** Points earned at this merchant in the last `windowDays` days. */
export async function statusPointsFor(merchantId: string, userId: number, windowDays: number, client: DbClient = db): Promise<number> {
  return loyaltyStore.sumStatusPoints(merchantId, userId, new Date(Date.now() - windowDays * DAY_MS), client);
}

export interface ResidentStatus {
  balance: LoyaltyBalance | null;
  tiers: LoyaltyTier[];
  statusPoints: number;
  tierWindowDays: number;
  tier: LoyaltyTier | null;
  nextTier: LoyaltyTier | null;
}

/**
 * Writes the resolved tier to the balance row when it differs, with a
 * tier_change event. Returns the balance as stored.
 */
async function syncTier(program: LoyaltyProgram, balance: LoyaltyBalance, tier: LoyaltyTier | null, client: DbClient): Promise<LoyaltyBalance> {
  if ((balance.tierId ?? null) === (tier?.id ?? null)) return balance;
  const updated = await loyaltyStore.updateBalance(balance.id, { tierId: tier?.id ?? null }, client);
  await loyaltyStore.createEvent(
    {
      merchantId: balance.merchantId,
      userId: balance.userId,
      programId: program.id,
      type: "tier_change",
      amount: null,
      metadata: { fromTierId: balance.tierId ?? null, toTierId: tier?.id ?? null, toTierName: tier?.name ?? null },
    },
    client,
  );
  return updated ?? { ...balance, tierId: tier?.id ?? null };
}

/**
 * The resident's rolling tier status at a merchant, computed from status points
 * and written back to `loyalty_balances.tierId` when there is a balance row.
 */
export async function residentStatus(
  program: LoyaltyProgram,
  merchantId: string,
  userId: number,
  client: DbClient = db,
  known: { tiers?: LoyaltyTier[]; balance?: LoyaltyBalance | null } = {},
): Promise<ResidentStatus> {
  const tierWindowDays = tierWindowDaysOf(program);
  const [tiers, balanceRow, statusPoints] = await Promise.all([
    known.tiers ?? loyaltyStore.listTiers(program.id, client),
    known.balance !== undefined ? known.balance : loyaltyStore.getBalance(merchantId, userId, client),
    statusPointsFor(merchantId, userId, tierWindowDays, client),
  ]);
  const { tier, nextTier } = resolveStatus(tiers, statusPoints);
  const balance = balanceRow ? await syncTier(program, balanceRow, tier, client) : null;
  return { balance, tiers, statusPoints, tierWindowDays, tier, nextTier };
}

// Balances ---------------------------------------------------------------------

/** Ensures the resident has a balance row at this merchant. */
export async function getOrCreateBalance(merchantId: string, userId: number, client: DbClient): Promise<LoyaltyBalance> {
  const existing = await loyaltyStore.getBalance(merchantId, userId, client);
  if (existing) return existing;
  return loyaltyStore.createBalance({ merchantId, userId, points: 0, stamps: 0 }, client);
}

export interface BalanceWithTier extends ResidentStatus {
  balance: LoyaltyBalance;
}

/** Sets the spendable points, then refreshes the rolling tier from status points. */
export async function setPointsAndRefreshStatus(
  program: LoyaltyProgram,
  balance: LoyaltyBalance,
  newPoints: number,
  client: DbClient,
): Promise<BalanceWithTier> {
  const updated = (await loyaltyStore.updateBalance(balance.id, { points: newPoints }, client)) ?? { ...balance, points: newPoints };
  const status = await residentStatus(program, balance.merchantId, balance.userId, client, { balance: updated });
  return { ...status, balance: status.balance ?? updated };
}

export interface AwardResult extends BalanceWithTier {
  pointsAwarded: number;
}

/**
 * Awards points for a purchase or scan (rule 6): base points from the programme,
 * multiplied by the resident's current tier, recorded as an earn_points event.
 */
export async function awardPoints(
  program: LoyaltyProgram,
  merchantId: string,
  userId: number,
  basketAmount: number | null,
  metadata: Record<string, unknown>,
  client: DbClient,
): Promise<AwardResult> {
  const balance = await getOrCreateBalance(merchantId, userId, client);
  const before = await residentStatus(program, merchantId, userId, client, { balance });
  const currentTier = before.tier;
  const pointsAwarded = pointsForRedemption(program, currentTier?.pointsMultiplier ?? 1, basketAmount);

  if (pointsAwarded > 0) {
    await loyaltyStore.createEvent(
      {
        merchantId,
        userId,
        programId: program.id,
        type: "earn_points",
        amount: pointsAwarded,
        metadata: { ...metadata, basketAmount, tierMultiplier: currentTier?.pointsMultiplier ?? "1.00" },
      },
      client,
    );
  }

  const result = await setPointsAndRefreshStatus(program, before.balance ?? balance, (balance.points ?? 0) + pointsAwarded, client);
  return { pointsAwarded, ...result };
}

/** Manual adjustment by the merchant; the amount may be negative. */
export async function adjustPoints(
  program: LoyaltyProgram,
  merchantId: string,
  userId: number,
  amount: number,
  reason: string,
  client: DbClient,
): Promise<BalanceWithTier> {
  const balance = await getOrCreateBalance(merchantId, userId, client);
  const newPoints = Math.max(0, (balance.points ?? 0) + amount);
  await loyaltyStore.createEvent(
    { merchantId, userId, programId: program.id, type: "adjust", amount, metadata: { reason } },
    client,
  );
  return setPointsAndRefreshStatus(program, balance, newPoints, client);
}

// Snapshots --------------------------------------------------------------------

export interface TierSnapshot {
  points: number;
  statusPoints: number;
  tierWindowDays: number;
  tierName: string | null;
  tierDiscountPercent: number | null;
  nextTier: { name: string; thresholdPoints: number } | null;
}

export function nextTierSummary(next: LoyaltyTier | null): TierSnapshot["nextTier"] {
  return next ? { name: next.name, thresholdPoints: next.thresholdPoints } : null;
}

/**
 * The resident's current points and rolling tier at a merchant, as shown on the
 * green screen (offer redemptions and reward claims). Zero points and no tier
 * when the merchant has no programme or the resident has no history there.
 */
export async function tierSnapshot(merchantId: string, userId: number, client: DbClient = db): Promise<TierSnapshot> {
  const program = await loyaltyStore.getProgramByMerchant(merchantId, client);
  if (!program) {
    return { points: 0, statusPoints: 0, tierWindowDays: DEFAULT_TIER_WINDOW_DAYS, tierName: null, tierDiscountPercent: null, nextTier: null };
  }
  const status = await residentStatus(program, merchantId, userId, client);
  return {
    points: status.balance?.points ?? 0,
    statusPoints: status.statusPoints,
    tierWindowDays: status.tierWindowDays,
    tierName: status.tier?.name ?? null,
    tierDiscountPercent: status.tier?.discountPercent || null,
    nextTier: nextTierSummary(status.nextTier),
  };
}
