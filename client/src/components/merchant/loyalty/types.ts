import type { LoyaltyProgram, LoyaltyReward, LoyaltyTier } from "@shared/schema";

export interface LoyaltyProgramData {
  program: LoyaltyProgram;
  tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
}

export const PROGRAM_KEY = ["/api/loyalty/program"] as const;

export function useProgramQueryKey() {
  return [...PROGRAM_KEY];
}

export interface LoyaltyMember {
  userId: number;
  customerAlias: string;
  points: number;
  statusPoints: number;
  tierWindowDays: number;
  tierName: string | null;
  nextTier: { name: string; thresholdPoints: number } | null;
  lastActivity: string | null;
}

export interface LoyaltyEventRow {
  id: string;
  userId: number;
  customerAlias: string;
  type: "earn_points" | "redeem_reward" | "adjust" | "tier_change";
  amount: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LoyaltyAnalytics {
  members: number;
  activeMembers30d: number;
  pointsIssued30d: number;
  rewardsRedeemed30d: number;
  redemptions30d: number;
  byWeek: { weekStart: string; redemptions: number; pointsIssued: number }[];
}

export const EVENT_LABELS: Record<LoyaltyEventRow["type"], string> = {
  earn_points: "Points earned",
  redeem_reward: "Reward redeemed",
  adjust: "Adjustment",
  tier_change: "Tier change",
};
