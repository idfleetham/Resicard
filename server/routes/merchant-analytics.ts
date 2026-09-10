import { Router } from "express";
import { config } from "../config";
import { DEFAULT_PERIOD, isPeriodKey, periodDays, periodWeeks, resolvePeriod } from "@shared/periods";
import * as analyticsStore from "../storage/analytics";
import * as merchantStore from "../storage/merchants";
import * as loyaltyStore from "../storage/loyalty";
import { authenticate, requireRole, currentMerchantId } from "../lib/auth";
import { asyncHandler, notFound, HttpError } from "../lib/http";
import { ANALYTICS_PLAN_REQUIRED_MESSAGE, hasAnalytics } from "../lib/plan";
import {
  buildBusiestDays,
  buildByDay,
  buildByHour,
  buildByOffer,
  buildByWeek,
  buildHeadline,
  buildMemberGrowth,
  firstSeenByUser,
  inWindow,
  median,
} from "../lib/analytics";

/**
 * GET /api/merchant/analytics — the Premium analytics screen.
 *
 * The period is chosen by the merchant with `?period=` (and `?from=`/`?to=` for
 * a custom range), defaulting to this quarter against the same days of the last
 * one. See `shared/periods.ts` for the windows and why the comparison rule
 * differs between a period to date and a finished one. All of it comes from
 * existing tables. The `town` block is suppressed
 * whenever fewer than `config.analyticsMinCohort` approved outlets share the
 * category, because a median across three outlets identifies them; nothing in it
 * ever names another outlet, and nothing anywhere names a resident.
 */

export const merchantAnalyticsRouter = Router();


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

/** A yyyy-mm-dd or ISO string from the query, or null if it is missing or nonsense. */
function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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

    /*
      The period is chosen by the merchant and defaults to this quarter. The
      window it is compared against comes from resolvePeriod, because the right
      comparison differs: a quarter part-way through is measured against the same
      elapsed days of the last quarter, while a finished period is measured
      against the equally long window before it.
    */
    const requested = String(req.query.period ?? "");
    const key = isPeriodKey(requested) ? requested : DEFAULT_PERIOD;
    const period = resolvePeriod(key, new Date(), {
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
    });
    const { from, to, compareFrom, compareTo } = period;

    const [allRows, firstSeen, offers, favourites, program] = await Promise.all([
      analyticsStore.listRedemptionsInWindow(merchantId, compareFrom, to),
      analyticsStore.firstRedemptionByUser(merchantId),
      analyticsStore.listOffersForMerchant(merchantId),
      analyticsStore.countFavourites(merchantId),
      loyaltyStore.getProgramByMerchant(merchantId),
    ]);

    const rows = inWindow(allRows, from, to);
    const previousRows = inWindow(allRows, compareFrom, compareTo);

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
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
        period: key,
        days: periodDays(period),
        compareLabel: period.compareLabel,
      },
      headline: buildHeadline(rows, previousRows, firstSeen, favourites, from),
      byWeek: buildByWeek(rows, firstSeen, to, periodWeeks(period)),
      byDay: buildByDay(rows),
      byHour: buildByHour(rows),
      byOffer: buildByOffer(rows, offers),
      loyalty,
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
