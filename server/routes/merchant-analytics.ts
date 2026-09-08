import { Router } from "express";
import { config } from "../config";
import * as analyticsStore from "../storage/analytics";
import * as merchantStore from "../storage/merchants";
import * as loyaltyStore from "../storage/loyalty";
import { authenticate, requireRole, currentMerchantId } from "../lib/auth";
import { asyncHandler, notFound, HttpError } from "../lib/http";
import { ANALYTICS_PLAN_REQUIRED_MESSAGE, hasAnalytics } from "../lib/plan";
import { AGE_BANDS, SEX_OPTIONS } from "@shared/schema";
import {
  buildBusiestDays,
  buildByDay,
  buildByHour,
  buildByOffer,
  buildByWeek,
  buildDemographics,
  buildHeadline,
  buildMemberGrowth,
  firstSeenByUser,
  inWindow,
  median,
} from "../lib/analytics";

/**
 * GET /api/merchant/analytics — the Premium analytics screen. Ninety days against
 * the ninety before, all from existing tables. The `town` block is suppressed
 * whenever fewer than `config.analyticsMinCohort` approved outlets share the
 * category, because a median across three outlets identifies them; nothing in it
 * ever names another outlet, and nothing anywhere names a resident.
 *
 * The `demographics` block is the same idea applied to people: it is the only
 * place a resident's age band or sex is ever reported, it is withheld entirely
 * below `config.analyticsMinCohort` residents, and any single band that thin is
 * folded into "not shown".
 */

export const merchantAnalyticsRouter = Router();

const WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurants",
  bar: "Bars",
  cafe: "Cafes",
  pub: "Pubs",
  takeaway: "Takeaways",
  hotel: "Hotels",
  retail: "Shops",
  services: "Services",
  experience: "Things to do",
};

function categoryLabel(category: string | null): string {
  if (!category) return "Outlets";
  return CATEGORY_LABELS[category] ?? `${category.charAt(0).toUpperCase()}${category.slice(1)}s`;
}

merchantAnalyticsRouter.get(
  "/api/merchant/analytics",
  authenticate,
  requireRole("merchant"),
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const merchant = await merchantStore.getMerchantById(merchantId);
    if (!merchant) throw notFound("Merchant not found");
    if (!hasAnalytics(merchant.planStatus)) throw new HttpError(403, ANALYTICS_PLAN_REQUIRED_MESSAGE, "plan_required");

    const to = new Date();
    const from = new Date(to.getTime() - WINDOW_DAYS * DAY_MS);
    const previousFrom = new Date(from.getTime() - WINDOW_DAYS * DAY_MS);

    const [allRows, firstSeen, offers, favourites, program, residents] = await Promise.all([
      analyticsStore.listRedemptionsInWindow(merchantId, previousFrom, to),
      analyticsStore.firstRedemptionByUser(merchantId),
      analyticsStore.listOffersForMerchant(merchantId),
      analyticsStore.countFavourites(merchantId),
      loyaltyStore.getProgramByMerchant(merchantId),
      analyticsStore.residentDemographicsInWindow(merchantId, from, to),
    ]);

    const rows = inWindow(allRows, from, to);
    const previousRows = inWindow(allRows, previousFrom, from);

    const loyalty = program
      ? await (async () => {
          const [members, stats, tiers] = await Promise.all([
            loyaltyStore.countBalances(merchantId),
            loyaltyStore.analyticsForMerchant(merchantId),
            analyticsStore.tierDistribution(merchantId, program.id),
          ]);
          return {
            members,
            activeMembers30d: stats.activeMembers30d,
            pointsIssued30d: stats.pointsIssued30d,
            rewardsClaimed30d: stats.rewardsRedeemed30d,
            tiers,
          };
        })()
      : null;

    const town = await buildTown(merchantId, merchant.category, to);

    res.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      headline: buildHeadline(rows, previousRows, firstSeen, favourites, from),
      byWeek: buildByWeek(rows, firstSeen, to),
      byDay: buildByDay(rows),
      byHour: buildByHour(rows),
      byOffer: buildByOffer(rows, offers),
      loyalty,
      demographics: buildDemographics(residents, AGE_BANDS, SEX_OPTIONS, config.analyticsMinCohort),
      town,
    });
  }),
);

/** The town block, or null when the category cohort is too small to stay anonymous. */
async function buildTown(merchantId: string, category: string | null, now: Date) {
  if (!category) return null;
  const cohort = await analyticsStore.categoryRedemptions30d(category);
  if (cohort.length < config.analyticsMinCohort) return null;

  const [byDay, growth] = await Promise.all([
    analyticsStore.townRedemptionsByDay(),
    analyticsStore.townActiveMembersByMonth(),
  ]);
  const mine = cohort.find((c) => c.merchantId === merchantId);
  return {
    categoryLabel: categoryLabel(category),
    outletsInCategory: cohort.length,
    yourRedemptions30d: mine?.redemptions ?? 0,
    medianRedemptions30d: median(cohort.map((c) => c.redemptions)),
    busiestDays: buildBusiestDays(byDay),
    memberGrowth: buildMemberGrowth(growth, now),
  };
}
