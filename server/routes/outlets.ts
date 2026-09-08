import { Router } from "express";
import type { LoyaltyReward, Merchant, Offer } from "@shared/schema";
import { db } from "../db";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import * as loyaltyStore from "../storage/loyalty";
import * as favouriteStore from "../storage/favourites";
import { authenticate, requireRole, currentUser } from "../lib/auth";
import { asyncHandler, notFound } from "../lib/http";
import { isOfferLiveNow, parseTime, toLocalDateTime } from "../lib/offer-rules";
import { config } from "../config";
import { canClaim, isTierBenefit, nextTierSummary, residentStatus } from "../lib/loyalty";
import { hasLoyalty } from "../lib/plan";
import { stripMenuPdf } from "./public";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pounds = (value: string | number | null) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value ?? 0));

/** The short label a client can print as-is: "20% off", "£15", "Free item". */
export function offerHeadline(offer: Pick<Offer, "type" | "percentOff" | "fixedPrice" | "shortPromo">): string {
  switch (offer.type) {
    case "percentage_discount":
      return offer.percentOff ? `${offer.percentOff}% off` : "Discount";
    case "fixed_amount_discount":
      return offer.fixedPrice ? `${pounds(offer.fixedPrice)} off` : "Money off";
    case "fixed_price":
      return offer.fixedPrice ? pounds(offer.fixedPrice) : "Fixed price";
    case "set_menu":
      return offer.fixedPrice ? pounds(offer.fixedPrice) : "Set menu";
    case "bogo":
      return "2 for 1";
    case "free_item_with_purchase":
      return "Free item";
    case "off_peak":
      return offer.percentOff ? `${offer.percentOff}% off off-peak` : "Off-peak offer";
    case "loyalty_reward":
      return "Loyalty reward";
    default:
      return offer.shortPromo ?? "Offer";
  }
}

/** Featured live offer if there is one, else the first live one. */
function bestOffer(live: Offer[]) {
  const pick = live.find((o) => o.priority === "featured") ?? live[0];
  return pick ? { id: pick.id, title: pick.title, headline: offerHeadline(pick) } : null;
}

function outletBase(m: {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  logoUrl: string | null;
  reservationProvider: string | null;
  reservationUrl: string | null;
}) {
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    address: m.address,
    logoUrl: m.logoUrl,
    reservationProvider: m.reservationProvider,
    reservationUrl: m.reservationUrl,
  };
}

export const outletsRouter = Router();

outletsRouter.get(
  "/api/outlets",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const userId = currentUser(req).id;
    const now = new Date();
    // Four queries in total, however many outlets there are.
    const [rows, offerRows, favouriteIds, balances] = await Promise.all([
      merchantStore.listApprovedMerchantsForOutlets(),
      offerStore.listPublicOffers({}),
      favouriteStore.listFavouriteMerchantIds(userId),
      loyaltyStore.listBalancesForUser(userId),
    ]);

    const favourites = new Set(favouriteIds);
    const liveByMerchant = new Map<string, Offer[]>();
    for (const row of offerRows) {
      if (!isOfferLiveNow(row.offer, now)) continue;
      const list = liveByMerchant.get(row.offer.merchantId) ?? [];
      list.push(row.offer);
      liveByMerchant.set(row.offer.merchantId, list);
    }

    const withLoyalty = new Set(rows.filter((m) => hasLoyalty(m.planStatus)).map((m) => m.id));
    const usable = balances.filter((b) => b.program.active && withLoyalty.has(b.merchant.id));
    const tierNames = await loyaltyStore.listTierNamesByIds(
      usable.map((b) => b.balance.tierId).filter((id): id is string => Boolean(id)),
    );
    const loyaltyByMerchant = new Map(
      usable.map((b) => [
        b.merchant.id,
        { points: b.balance.points ?? 0, tierName: b.balance.tierId ? tierNames.get(b.balance.tierId) ?? null : null },
      ]),
    );

    const outlets = rows.map((m) => {
      const live = liveByMerchant.get(m.id) ?? [];
      return {
        ...outletBase(m),
        isFavourite: favourites.has(m.id),
        liveOfferCount: live.length,
        bestOffer: bestOffer(live),
        loyalty: loyaltyByMerchant.get(m.id) ?? null,
      };
    });

    // Starred outlets first, then alphabetical (the query already sorts by name).
    outlets.sort((a, b) => Number(b.isFavourite) - Number(a.isFavourite));
    res.json(outlets);
  }),
);

/**
 * Outlets placed on the map and what is live at this exact moment. Outlets without
 * coordinates come back separately rather than being dropped, because a resident who
 * cannot see their local on the map should still be told it is in the scheme.
 */
outletsRouter.get(
  "/api/outlets/map",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const userId = currentUser(req).id;
    const now = new Date();
    const [rows, offerRows, favouriteIds, balances] = await Promise.all([
      merchantStore.listApprovedMerchantsForMap(),
      offerStore.listPublicOffers({}),
      favouriteStore.listFavouriteMerchantIds(userId),
      loyaltyStore.listBalancesForUser(userId),
    ]);

    const favourites = new Set(favouriteIds);
    const liveByMerchant = new Map<string, Offer[]>();
    for (const row of offerRows) {
      if (!isOfferLiveNow(row.offer, now)) continue;
      const list = liveByMerchant.get(row.offer.merchantId) ?? [];
      list.push(row.offer);
      liveByMerchant.set(row.offer.merchantId, list);
    }

    const withLoyalty = new Set(rows.filter((m) => hasLoyalty(m.planStatus)).map((m) => m.id));
    const usable = balances.filter((b) => b.program.active && withLoyalty.has(b.merchant.id));
    const tiers = await loyaltyStore.listTierSummariesByIds(
      usable.map((b) => b.balance.tierId).filter((id): id is string => Boolean(id)),
    );
    const loyaltyByMerchant = new Map(
      usable
        .map((b) => [b.merchant.id, b.balance.tierId ? tiers.get(b.balance.tierId) ?? null : null] as const)
        .filter((entry): entry is readonly [string, { name: string; discountPercent: number | null }] => entry[1] !== null)
        .map(([id, tier]) => [id, { tierName: tier.name, discountPercent: tier.discountPercent }]),
    );

    const placed = rows.filter((m) => m.latitude !== null && m.longitude !== null);
    const unplaced = rows.filter((m) => m.latitude === null || m.longitude === null);

    res.json({
      centre: { lat: config.mapCentreLat, lng: config.mapCentreLng },
      outlets: placed.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        latitude: Number(m.latitude),
        longitude: Number(m.longitude),
        isFavourite: favourites.has(m.id),
        liveOffers: (liveByMerchant.get(m.id) ?? []).map((o) => ({
          id: o.id,
          title: o.title,
          headline: offerHeadline(o),
          endsAt: slotEndsAt(o, now),
        })),
        loyalty: loyaltyByMerchant.get(m.id) ?? null,
      })),
      withoutCoordinates: unplaced.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        liveOfferCount: (liveByMerchant.get(m.id) ?? []).length,
      })),
    });
  }),
);

/**
 * When the offer's current time slot runs out, or null when today is unrestricted.
 * Worked out as an offset from now rather than by rebuilding a local timestamp, so
 * no time-zone arithmetic is needed beyond what `toLocalDateTime` already does.
 */
function slotEndsAt(offer: Offer, now: Date): string | null {
  const local = toLocalDateTime(now);
  const slots = offer.timeSlots?.[local.day] ?? [];
  for (const slot of slots) {
    const start = parseTime(slot.start);
    const end = parseTime(slot.end);
    if (start === null || end === null || start === end) continue;
    const within = start < end ? local.minutes >= start && local.minutes < end : local.minutes >= start;
    if (!within) continue;
    const minutesLeft = end > local.minutes ? end - local.minutes : end + 24 * 60 - local.minutes;
    return new Date(now.getTime() + minutesLeft * 60_000).toISOString();
  }
  return null;
}

/** Points, tier and rewards for this resident at one outlet, or null. */
async function outletLoyalty(merchant: Merchant, userId: number) {
  if (!hasLoyalty(merchant.planStatus)) return null;
  const program = await loyaltyStore.getProgramByMerchant(merchant.id);
  if (!program || !program.active) return null;

  const [status, allRewards, lastClaims] = await Promise.all([
    residentStatus(program, merchant.id, userId, db),
    loyaltyStore.listRewards(program.id, true),
    loyaltyStore.lastClaimAtByReward(merchant.id, userId),
  ]);
  const now = new Date();
  const check = (r: LoyaltyReward) => canClaim(r, status.tier, status.tiers, lastClaims.get(r.id) ?? null, now);
  const benefits = allRewards
    .filter(isTierBenefit)
    .filter((r) => check(r).entitled)
    .map((r) => {
      const c = check(r);
      return { ...r, claimable: c.ok, nextClaimAt: c.nextClaimAt ? c.nextClaimAt.toISOString() : null };
    });

  return {
    points: status.balance?.points ?? 0,
    statusPoints: status.statusPoints,
    tierWindowDays: status.tierWindowDays,
    tier: status.tier
      ? { name: status.tier.name, color: status.tier.color, discountPercent: status.tier.discountPercent || null }
      : null,
    nextTier: nextTierSummary(status.nextTier),
    benefits,
    rewards: allRewards.filter((r) => !isTierBenefit(r)),
  };
}

outletsRouter.get(
  "/api/outlets/:id",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) throw notFound("Outlet not found");
    const userId = currentUser(req).id;
    const merchant = await merchantStore.getMerchantById(req.params.id);
    if (!merchant || merchant.status !== "approved") throw notFound("Outlet not found");

    const now = new Date();
    const [allOffers, isFavourite, loyalty] = await Promise.all([
      offerStore.listActiveOffersForMerchant(merchant.id),
      favouriteStore.isFavourite(userId, merchant.id),
      outletLoyalty(merchant, userId),
    ]);
    // Browsing, not redeeming: the schedule decides what is on, not the resident's limits.
    const live = allOffers.filter((o) => isOfferLiveNow(o, now));

    res.json({
      ...outletBase(merchant),
      isFavourite,
      liveOfferCount: live.length,
      bestOffer: bestOffer(live),
      offers: live.map(stripMenuPdf),
      allOffers: allOffers.map(stripMenuPdf),
      loyalty,
    });
  }),
);

/** Both favourite routes need an approved outlet. */
async function requireApprovedMerchant(id: string): Promise<Merchant> {
  if (!UUID_RE.test(id)) throw notFound("Outlet not found");
  const merchant = await merchantStore.getMerchantById(id);
  if (!merchant || merchant.status !== "approved") throw notFound("Outlet not found");
  return merchant;
}

outletsRouter.put(
  "/api/favourites/:merchantId",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const merchant = await requireApprovedMerchant(req.params.merchantId);
    await favouriteStore.addFavourite(currentUser(req).id, merchant.id);
    res.json({ isFavourite: true });
  }),
);

outletsRouter.delete(
  "/api/favourites/:merchantId",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const merchant = await requireApprovedMerchant(req.params.merchantId);
    await favouriteStore.removeFavourite(currentUser(req).id, merchant.id);
    res.json({ isFavourite: false });
  }),
);
