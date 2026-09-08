import { Router } from "express";
import { z } from "zod";
import { and, eq, gte, ilike, or, sql } from "drizzle-orm";
import { users, merchants, offers, redemptions, generateCustomerAlias, USER_ROLES, type UserRole } from "@shared/schema";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import * as redemptionStore from "../storage/redemptions";
import * as postcardStore from "../storage/postcards";
import * as favouriteStore from "../storage/favourites";
import { config } from "../config";
import { effectiveMembership } from "../lib/membership";
import { expiryDate, hashCode, newPostcardCode, printSheetHtml } from "../lib/postcards";
import { authenticate, requireRole, currentUser, toPublicUser } from "../lib/auth";
import { asyncHandler, parseBody, notFound, badRequest } from "../lib/http";
import { emailService } from "../email";
import { dedupeKeys, sendOnce } from "../lib/mailer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const postIdsSchema = z.object({ ids: z.array(z.string().regex(UUID_RE)).min(1).max(200) });
const verifyNoteSchema = z.object({ note: z.string().max(200).optional() });
const POSTCARD_STATUSES = ["requested", "posted", "used", "expired", "cancelled"] as const;

export const adminRouter = Router();
adminRouter.use("/api/admin", authenticate, requireRole("admin"));

adminRouter.get(
  "/api/admin/stats",
  asyncHandler(async (_req, res) => {
    const monthStart = sql`date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London'`;
    const [
      residents,
      verifiedResidents,
      activeMembers,
      merchantCount,
      pendingMerchants,
      postcardsToPost,
      offerCount,
      redemptionsThisMonth,
    ] = await Promise.all([
      userStore.countUsersWhere(eq(users.role, "resident")),
      userStore.countUsersWhere(and(eq(users.role, "resident"), eq(users.isResidencyVerified, true))),
      userStore.countUsersWhere(and(eq(users.role, "resident"), eq(users.membershipStatus, "active"))),
      merchantStore.countMerchantsWhere(undefined),
      merchantStore.countMerchantsWhere(eq(merchants.status, "pending")),
      postcardStore.countPostcardsByStatus("requested"),
      offerStore.countOffersWhere(eq(offers.archived, false)),
      redemptionStore.countRedemptionsWhere(gte(redemptions.redeemedAt, monthStart)),
    ]);
    res.json({
      residents,
      verifiedResidents,
      activeMembers,
      merchants: merchantCount,
      pendingMerchants,
      postcardsToPost,
      offers: offerCount,
      redemptionsThisMonth,
    });
  }),
);

function parseUserId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw notFound("User not found");
  return id;
}

function residentName(u: { firstName: string | null; surname: string | null; email: string }): string {
  return [u.firstName, u.surname].filter(Boolean).join(" ") || u.email;
}

// Postcards

adminRouter.get(
  "/api/admin/postcards",
  asyncHandler(async (req, res) => {
    const raw = typeof req.query.status === "string" ? req.query.status : "requested";
    const status = (POSTCARD_STATUSES as readonly string[]).includes(raw) ? (raw as (typeof POSTCARD_STATUSES)[number]) : "requested";
    const rows = await postcardStore.listPostcardsByStatus(status);
    res.json(
      rows.map((p) => ({
        id: p.id,
        userId: p.userId,
        name: residentName(p),
        email: p.email,
        address: p.addressSnapshot,
        status: p.status,
        requestedAt: p.requestedAt,
        postedAt: p.postedAt,
        expiresAt: p.status === "posted" ? p.expiresAt : null,
        attempts: p.attempts ?? 0,
      })),
    );
  }),
);

adminRouter.post(
  "/api/admin/postcards/post",
  asyncHandler(async (req, res) => {
    const { ids } = parseBody(postIdsSchema, req.body);
    const rows = await postcardStore.listRequestedPostcardsByIds(ids);
    if (rows.length === 0) throw badRequest("None of those postcards are waiting to be posted");
    const now = new Date();
    const expiresAt = expiryDate(config.postcardCodeDays, now);
    const adminId = currentUser(req).id;
    const posted: { id: string; name: string; address: string; code: string }[] = [];
    for (const p of rows) {
      const code = newPostcardCode();
      await postcardStore.updatePostcard(p.id, {
        codeHash: hashCode(code),
        status: "posted",
        postedAt: now,
        postedBy: adminId,
        expiresAt,
        attempts: 0,
      });
      posted.push({ id: p.id, name: residentName(p), address: p.addressSnapshot, code });
      // Keyed on the postcard, so a resident who has one re-issued hears about that one too.
      await sendOnce(p.userId, "postcard_posted", dedupeKeys.postcardPosted(p.id), () =>
        emailService.sendPostcardPosted(p.email, p.firstName, expiresAt),
      );
    }
    // The plain codes exist only in this response and the print sheet built from it.
    const printHtml = printSheetHtml(posted.map((c) => ({ ...c, expiresAt })));
    res.json({ posted, printHtml });
  }),
);

adminRouter.post(
  "/api/admin/postcards/:id/cancel",
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) throw notFound("Postcard not found");
    const postcard = await postcardStore.getPostcardById(req.params.id);
    if (!postcard) throw notFound("Postcard not found");
    if (postcard.status !== "requested" && postcard.status !== "posted") throw badRequest("That postcard is no longer open");
    const updated = await postcardStore.updatePostcard(postcard.id, { status: "cancelled" });
    res.json({ id: updated?.id ?? postcard.id, status: updated?.status ?? "cancelled" });
  }),
);

// Residents desk (in-person verification)

adminRouter.get(
  "/api/admin/residents",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const verifiedRaw = typeof req.query.verified === "string" ? req.query.verified : "";
    const conditions = [eq(users.role, "resident")];
    if (verifiedRaw === "true" || verifiedRaw === "false") conditions.push(eq(users.isResidencyVerified, verifiedRaw === "true"));
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
      conditions.push(
        or(
          ilike(users.firstName, like),
          ilike(users.surname, like),
          ilike(sql`concat_ws(' ', ${users.firstName}, ${users.surname})`, like),
          ilike(users.email, like),
          ilike(users.username, like),
          ilike(users.postcode, like),
          ilike(users.addressLine1, like),
        )!,
      );
    }
    const rows = await userStore.listUsersWhere(and(...conditions)!, 300);
    // Who did each verification, so the trail an outlet leaves can be read here.
    const outletNames = new Map<string, string | null>();
    const staffNames = new Map<number, string | null>();
    for (const u of rows) {
      if (u.verifiedByMerchantId && !outletNames.has(u.verifiedByMerchantId)) {
        outletNames.set(u.verifiedByMerchantId, (await merchantStore.getMerchantById(u.verifiedByMerchantId))?.name ?? null);
      }
      if (u.verifiedBy && !staffNames.has(u.verifiedBy)) {
        const who = await userStore.getUserById(u.verifiedBy);
        staffNames.set(u.verifiedBy, who ? residentName(who) : null);
      }
    }
    const out = [];
    for (const u of rows) {
      const primary = await userStore.getHouseholdPrimary(u);
      const membership = effectiveMembership(u, primary);
      out.push({
        id: u.id,
        name: residentName(u),
        email: u.email,
        username: u.username,
        address: { addressLine1: u.addressLine1, addressLine2: u.addressLine2, town: u.town, postcode: u.postcode },
        verified: Boolean(u.isResidencyVerified),
        verifiedAt: u.verifiedAt,
        method: u.verificationMethod ?? null,
        verifiedByOutlet: u.verifiedByMerchantId
          ? { id: u.verifiedByMerchantId, name: outletNames.get(u.verifiedByMerchantId) ?? null }
          : null,
        verifiedByUser: u.verifiedBy ? staffNames.get(u.verifiedBy) ?? null : null,
        membership: { status: membership.status, expiry: membership.expiry, plan: membership.plan },
        createdAt: u.createdAt,
      });
    }
    res.json(out);
  }),
);

adminRouter.post(
  "/api/admin/residents/:userId/verify",
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    parseBody(verifyNoteSchema, req.body ?? {});
    const target = await userStore.getUserById(userId);
    if (!target || target.role !== "resident") throw notFound("User not found");
    await postcardStore.cancelOpenPostcards(userId);
    const user = await userStore.updateUser(userId, {
      isResidencyVerified: true,
      verifiedAt: new Date(),
      verifiedBy: currentUser(req).id,
      verifiedByMerchantId: null,
      verificationMethod: "in_person",
      verificationCode: null,
    });
    if (!user) throw notFound("User not found");
    res.json(toPublicUser(user));
  }),
);

adminRouter.post(
  "/api/admin/residents/:userId/unverify",
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const target = await userStore.getUserById(userId);
    if (!target || target.role !== "resident") throw notFound("User not found");
    // A fresh code is issued the next time they look at the panel; the old one
    // stays spent, so revoking cannot resurrect the code that was used.
    const user = await userStore.updateUser(userId, {
      isResidencyVerified: false,
      verifiedAt: null,
      verifiedBy: null,
      verifiedByMerchantId: null,
      verificationMethod: null,
      verificationCode: null,
    });
    if (!user) throw notFound("User not found");
    res.json(toPublicUser(user));
  }),
);

adminRouter.get(
  "/api/admin/merchants",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = await merchantStore.listMerchantsForAdmin(status);
    const counts = await favouriteStore.countFavouritesByMerchant(rows.map((r) => r.merchant.id));
    res.json(
      rows.map((r) => ({
        ...r.merchant,
        owner: r.owner,
        offerCount: r.offerCount,
        favouriteCount: counts.get(r.merchant.id) ?? 0,
      })),
    );
  }),
);

async function setMerchantStatus(id: string, status: "approved" | "rejected", adminId: number) {
  if (!UUID_RE.test(id)) throw notFound("Merchant not found");
  const merchant = await merchantStore.updateMerchant(id, {
    status,
    approvedAt: status === "approved" ? new Date() : null,
    approvedBy: status === "approved" ? adminId : null,
  });
  if (!merchant) throw notFound("Merchant not found");
  return merchant;
}

adminRouter.post(
  "/api/admin/merchants/:id/approve",
  asyncHandler(async (req, res) => {
    const merchant = await setMerchantStatus(req.params.id, "approved", currentUser(req).id);
    const owner = await userStore.getUserById(merchant.ownerUserId);
    if (owner) {
      await sendOnce(owner.id, "merchant_approved", dedupeKeys.merchantApproved(merchant.id), () =>
        emailService.sendMerchantApproved(merchant.email ?? owner.email, merchant.name, owner.firstName),
      );
    }
    res.json(merchant);
  }),
);

adminRouter.post(
  "/api/admin/merchants/:id/reject",
  asyncHandler(async (req, res) => {
    res.json(await setMerchantStatus(req.params.id, "rejected", currentUser(req).id));
  }),
);

adminRouter.get(
  "/api/admin/users",
  asyncHandler(async (req, res) => {
    const role = typeof req.query.role === "string" && (USER_ROLES as readonly string[]).includes(req.query.role)
      ? (req.query.role as UserRole)
      : undefined;
    const rows = await userStore.listUsers(role);
    res.json(rows.map(toPublicUser));
  }),
);

adminRouter.get(
  "/api/admin/redemptions",
  asyncHandler(async (_req, res) => {
    const rows = await redemptionStore.listRecentRedemptions(200);
    res.json(
      rows.map(({ userId, username, ...rest }) => ({
        ...rest,
        customerAlias: generateCustomerAlias({ id: userId, username }),
      })),
    );
  }),
);
