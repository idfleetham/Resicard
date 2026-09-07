import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { and, eq, gte } from "drizzle-orm";
import {
  insertLoyaltyProgramSchema,
  insertLoyaltyTierSchema,
  insertLoyaltyRewardSchema,
  generateCustomerAlias,
  redemptions,
  type LoyaltyProgram,
} from "@shared/schema";
import { db } from "../db";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import * as loyaltyStore from "../storage/loyalty";
import * as redemptionStore from "../storage/redemptions";
import { authenticate, requireRole, currentUser, currentMerchantId } from "../lib/auth";
import { asyncHandler, parseBody, notFound, badRequest, forbidden } from "../lib/http";
import { awardPoints, adjustPoints, getOrCreateBalance, setPointsAndRecalculateTier } from "../lib/loyalty";
import { generateRedemptionCode, nextTier, resolveTier } from "../lib/offer-rules";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const adjustSchema = z.object({ amount: z.number().int(), reason: z.string().min(1) });
const earnSchema = z
  .object({
    staffPin: z.string().min(1),
    userId: z.number().int().optional(),
    redemptionCode: z.string().min(1).optional(),
    basketAmount: z.number().nonnegative().optional().nullable(),
  })
  .refine((v) => v.userId !== undefined || v.redemptionCode !== undefined, {
    message: "Provide either userId or redemptionCode",
  });
const redeemRewardSchema = z.object({ merchantId: z.string().uuid(), rewardId: z.string().uuid() });
// drizzle-zod types `model` as a plain string; narrow it to the allowed values.
const programUpdateSchema = insertLoyaltyProgramSchema
  .partial()
  .extend({ model: z.enum(["points", "stamps"]).optional().nullable() });

async function requireProgram(merchantId: string): Promise<LoyaltyProgram> {
  const program = await loyaltyStore.getProgramByMerchant(merchantId);
  if (!program) throw notFound("No loyalty programme set up yet");
  return program;
}

async function programPayload(program: LoyaltyProgram) {
  const [tiers, rewards] = await Promise.all([loyaltyStore.listTiers(program.id), loyaltyStore.listRewards(program.id)]);
  return { program, tiers, rewards };
}

export const loyaltyRouter = Router();

// Merchant side ---------------------------------------------------------------

const merchantOnly = [authenticate, requireRole("merchant")] as const;

loyaltyRouter.get(
  "/api/loyalty/program",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const program = await loyaltyStore.getProgramByMerchant(currentMerchantId(req));
    res.json(program ? await programPayload(program) : null);
  }),
);

loyaltyRouter.put(
  "/api/loyalty/program",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const input = parseBody(programUpdateSchema, req.body);
    const existing = await loyaltyStore.getProgramByMerchant(merchantId);
    // Tiers are never created automatically; the merchant adds them via POST /api/loyalty/tiers.
    const program = existing
      ? await loyaltyStore.updateProgram(existing.id, input)
      : await loyaltyStore.createProgram({ ...input, merchantId });
    if (!program) throw notFound("Loyalty programme not found");
    res.json(await programPayload(program));
  }),
);

loyaltyRouter.post(
  "/api/loyalty/tiers",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const program = await requireProgram(currentMerchantId(req));
    const input = parseBody(insertLoyaltyTierSchema, req.body);
    res.status(201).json(await loyaltyStore.createTier({ ...input, programId: program.id }));
  }),
);

loyaltyRouter.put(
  "/api/loyalty/tiers/:tierId",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const program = await requireProgram(currentMerchantId(req));
    if (!UUID_RE.test(req.params.tierId)) throw notFound("Tier not found");
    const tier = await loyaltyStore.getTier(req.params.tierId, program.id);
    if (!tier) throw notFound("Tier not found");
    const input = parseBody(insertLoyaltyTierSchema.partial(), req.body);
    res.json((await loyaltyStore.updateTier(tier.id, input)) ?? tier);
  }),
);

loyaltyRouter.delete(
  "/api/loyalty/tiers/:tierId",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const program = await requireProgram(currentMerchantId(req));
    if (!UUID_RE.test(req.params.tierId)) throw notFound("Tier not found");
    const tier = await loyaltyStore.getTier(req.params.tierId, program.id);
    if (!tier) throw notFound("Tier not found");
    await db.transaction((tx) => loyaltyStore.deleteTier(tier.id, tx));
    res.json({ ok: true });
  }),
);

loyaltyRouter.post(
  "/api/loyalty/rewards",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const program = await requireProgram(currentMerchantId(req));
    const input = parseBody(insertLoyaltyRewardSchema, req.body);
    res.status(201).json(await loyaltyStore.createReward({ ...input, programId: program.id }));
  }),
);

loyaltyRouter.put(
  "/api/loyalty/rewards/:rewardId",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const program = await requireProgram(currentMerchantId(req));
    if (!UUID_RE.test(req.params.rewardId)) throw notFound("Reward not found");
    const reward = await loyaltyStore.getReward(req.params.rewardId, program.id);
    if (!reward) throw notFound("Reward not found");
    const input = parseBody(insertLoyaltyRewardSchema.partial(), req.body);
    res.json((await loyaltyStore.updateReward(reward.id, input)) ?? reward);
  }),
);

loyaltyRouter.delete(
  "/api/loyalty/rewards/:rewardId",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const program = await requireProgram(currentMerchantId(req));
    if (!UUID_RE.test(req.params.rewardId)) throw notFound("Reward not found");
    const reward = await loyaltyStore.getReward(req.params.rewardId, program.id);
    if (!reward) throw notFound("Reward not found");
    await loyaltyStore.deleteReward(reward.id);
    res.json({ ok: true });
  }),
);

loyaltyRouter.get(
  "/api/loyalty/members",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const rows = await loyaltyStore.listBalancesForMerchant(currentMerchantId(req));
    res.json(
      rows.map((r) => ({
        userId: r.balance.userId,
        customerAlias: generateCustomerAlias({ id: r.balance.userId, username: r.username }),
        points: r.balance.points ?? 0,
        stamps: r.balance.stamps ?? 0,
        tierName: r.tierName ?? null,
        lastActivity: r.balance.updatedAt,
      })),
    );
  }),
);

loyaltyRouter.post(
  "/api/loyalty/members/:userId/adjust",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const program = await requireProgram(merchantId);
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) throw notFound("Member not found");
    const member = await userStore.getUserById(userId);
    if (!member || member.role !== "resident") throw notFound("Member not found");
    const { amount, reason } = parseBody(adjustSchema, req.body);
    const result = await db.transaction((tx) => adjustPoints(program, merchantId, userId, amount, reason, tx));
    res.json({ ...result.balance, tierName: result.tier?.name ?? null });
  }),
);

loyaltyRouter.get(
  "/api/loyalty/events",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const rows = await loyaltyStore.listEventsForMerchant(currentMerchantId(req), limit);
    res.json(rows.map((r) => ({ ...r.event, customerAlias: generateCustomerAlias({ id: r.event.userId, username: r.username }) })));
  }),
);

loyaltyRouter.get(
  "/api/loyalty/analytics",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const WEEKS = 12;
    const [members, stats, redemptions30d, redemptionsByWeek, pointsByWeek] = await Promise.all([
      loyaltyStore.countBalances(merchantId),
      loyaltyStore.analyticsForMerchant(merchantId),
      redemptionStore.countRedemptionsWhere(
        and(eq(redemptions.merchantId, merchantId), gte(redemptions.redeemedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
      ),
      redemptionStore.countRedemptionsByWeek(merchantId, WEEKS),
      loyaltyStore.pointsIssuedByWeek(merchantId, WEEKS),
    ]);
    const byWeek = new Map<string, { weekStart: string; redemptions: number; pointsIssued: number }>();
    for (const r of redemptionsByWeek) byWeek.set(r.weekStart, { weekStart: r.weekStart, redemptions: r.redemptions, pointsIssued: 0 });
    for (const p of pointsByWeek) {
      const entry = byWeek.get(p.weekStart) ?? { weekStart: p.weekStart, redemptions: 0, pointsIssued: 0 };
      entry.pointsIssued = p.pointsIssued;
      byWeek.set(p.weekStart, entry);
    }
    res.json({
      members,
      activeMembers30d: stats.activeMembers30d,
      pointsIssued30d: stats.pointsIssued30d,
      rewardsRedeemed30d: stats.rewardsRedeemed30d,
      redemptions30d,
      byWeek: Array.from(byWeek.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    });
  }),
);

loyaltyRouter.post(
  "/api/loyalty/earn",
  ...merchantOnly,
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const program = await requireProgram(merchantId);
    if (!program.active) throw badRequest("The loyalty programme is not active");
    const input = parseBody(earnSchema, req.body);

    // The PIN must belong to a staff member of this merchant.
    const staff = await userStore.listUsersByMerchant(merchantId);
    let pinOk = false;
    for (const member of staff) {
      if (member.staffPin && (await bcrypt.compare(input.staffPin, member.staffPin))) {
        pinOk = true;
        break;
      }
    }
    if (!pinOk) throw forbidden("Staff PIN not recognised");

    let userId = input.userId;
    if (userId === undefined && input.redemptionCode) {
      const redemption = await redemptionStore.getRedemptionByCode(input.redemptionCode);
      if (!redemption || redemption.merchantId !== merchantId) throw notFound("Redemption code not found");
      userId = redemption.userId;
    }
    const member = userId !== undefined ? await userStore.getUserById(userId) : undefined;
    if (!member || member.role !== "resident") throw notFound("Member not found");

    // Cooldown and daily cap on staff-awarded earns.
    const cooldownMs = (program.earnCooldownMinutes ?? 0) * 60 * 1000;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const since = new Date(Math.min(dayStart.getTime(), Date.now() - cooldownMs));
    const recent = await loyaltyStore.listRecentEarnEvents(merchantId, member.id, since);
    if (cooldownMs > 0 && recent.some((e) => e.createdAt && Date.now() - e.createdAt.getTime() < cooldownMs)) {
      throw badRequest("Points were awarded to this member recently; please wait before awarding again");
    }
    const todayCount = recent.filter((e) => e.createdAt && e.createdAt >= dayStart).length;
    if ((program.dailyEarnCap ?? 0) > 0 && todayCount >= (program.dailyEarnCap ?? 0)) {
      throw badRequest("This member has reached today's earning limit");
    }

    const result = await db.transaction((tx) =>
      awardPoints(program, merchantId, member.id, input.basketAmount ?? null, { source: "staff_earn", staffUserId: currentUser(req).id }, tx),
    );
    res.json({
      pointsAwarded: result.pointsAwarded,
      balance: result.balance,
      tierName: result.tier?.name ?? null,
      customerAlias: generateCustomerAlias(member),
    });
  }),
);

// Resident side ----------------------------------------------------------------

loyaltyRouter.get(
  "/api/loyalty/mine",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const rows = await loyaltyStore.listBalancesForUser(currentUser(req).id);
    const result = [];
    for (const row of rows) {
      const [tiers, rewards] = await Promise.all([
        loyaltyStore.listTiers(row.program.id),
        loyaltyStore.listRewards(row.program.id, true),
      ]);
      const points = row.balance.points ?? 0;
      const tier = row.tier ?? resolveTier(tiers, points);
      const next = nextTier(tiers, points);
      result.push({
        merchant: row.merchant,
        points,
        stamps: row.balance.stamps ?? 0,
        tier: tier ? { name: tier.name, color: tier.color, discountPercent: tier.discountPercent } : null,
        nextTier: next ? { name: next.name, thresholdPoints: next.thresholdPoints } : null,
        rewards,
      });
    }
    res.json(result);
  }),
);

loyaltyRouter.post(
  "/api/loyalty/redeem-reward",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const userId = currentUser(req).id;
    const { merchantId, rewardId } = parseBody(redeemRewardSchema, req.body);
    const merchant = await merchantStore.getMerchantById(merchantId);
    if (!merchant) throw notFound("Merchant not found");
    const program = await requireProgram(merchantId);
    if (!program.active) throw badRequest("The loyalty programme is not active");
    const reward = await loyaltyStore.getReward(rewardId, program.id);
    if (!reward || !reward.active) throw notFound("Reward not found");

    const outcome = await db.transaction(async (tx) => {
      const balance = await getOrCreateBalance(merchantId, userId, tx);
      const costPoints = reward.costPoints ?? 0;
      const costStamps = reward.costStamps ?? 0;
      if ((balance.points ?? 0) < costPoints) throw badRequest("Not enough points for this reward");
      if ((balance.stamps ?? 0) < costStamps) throw badRequest("Not enough stamps for this reward");
      const code = generateRedemptionCode();
      await loyaltyStore.createEvent(
        {
          merchantId,
          userId,
          programId: program.id,
          type: "redeem_reward",
          amount: -costPoints,
          metadata: { rewardId: reward.id, rewardName: reward.name, costStamps, code },
        },
        tx,
      );
      if (costStamps > 0) {
        await loyaltyStore.updateBalance(balance.id, { stamps: (balance.stamps ?? 0) - costStamps }, tx);
      }
      const updated = await setPointsAndRecalculateTier(program, balance, (balance.points ?? 0) - costPoints, tx);
      return { balance: updated.balance, tier: updated.tier, code };
    });
    res.json({ balance: { ...outcome.balance, tierName: outcome.tier?.name ?? null }, code: outcome.code });
  }),
);
