import type { LoyaltyProgram, LoyaltyTier, LoyaltyBalance } from "@shared/schema";
import type { DbClient } from "../storage/types";
import * as loyaltyStore from "../storage/loyalty";
import { pointsForRedemption, resolveTier } from "./offer-rules";

export interface BalanceWithTier {
  balance: LoyaltyBalance;
  tier: LoyaltyTier | null;
}

/** Ensures the resident has a balance row at this merchant. */
export async function getOrCreateBalance(merchantId: string, userId: number, client: DbClient): Promise<LoyaltyBalance> {
  const existing = await loyaltyStore.getBalance(merchantId, userId, client);
  if (existing) return existing;
  return loyaltyStore.createBalance({ merchantId, userId, points: 0, stamps: 0 }, client);
}

/**
 * Sets the balance to the given points, recalculates the tier (highest tier whose
 * threshold is at or below the points) and writes a tier_change event when it moves.
 */
export async function setPointsAndRecalculateTier(
  program: LoyaltyProgram,
  balance: LoyaltyBalance,
  newPoints: number,
  client: DbClient,
): Promise<BalanceWithTier> {
  const tiers = await loyaltyStore.listTiers(program.id, client);
  const tier = resolveTier(tiers, newPoints);
  const updated = await loyaltyStore.updateBalance(balance.id, { points: newPoints, tierId: tier?.id ?? null }, client);
  if ((balance.tierId ?? null) !== (tier?.id ?? null)) {
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
  }
  return { balance: updated ?? { ...balance, points: newPoints, tierId: tier?.id ?? null }, tier };
}

export interface AwardResult {
  pointsAwarded: number;
  balance: LoyaltyBalance;
  tier: LoyaltyTier | null;
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
  const currentTier = balance.tierId ? await loyaltyStore.getTierById(balance.tierId, client) : undefined;
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

  const result = await setPointsAndRecalculateTier(program, balance, (balance.points ?? 0) + pointsAwarded, client);
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
  return setPointsAndRecalculateTier(program, balance, newPoints, client);
}
