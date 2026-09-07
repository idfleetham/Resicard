import { Router } from "express";
import { z } from "zod";
import { and, eq, gte, sql } from "drizzle-orm";
import { users, merchants, offers, redemptions, generateCustomerAlias, USER_ROLES, type UserRole } from "@shared/schema";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import * as redemptionStore from "../storage/redemptions";
import { authenticate, requireRole, currentUser, toPublicUser } from "../lib/auth";
import { asyncHandler, parseBody, notFound, badRequest } from "../lib/http";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rejectSchema = z.object({ reason: z.string().min(1) });

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
      pendingDocuments,
      offerCount,
      redemptionsThisMonth,
    ] = await Promise.all([
      userStore.countUsersWhere(eq(users.role, "resident")),
      userStore.countUsersWhere(and(eq(users.role, "resident"), eq(users.isResidencyVerified, true))),
      userStore.countUsersWhere(and(eq(users.role, "resident"), eq(users.membershipStatus, "active"))),
      merchantStore.countMerchantsWhere(undefined),
      merchantStore.countMerchantsWhere(eq(merchants.status, "pending")),
      userStore.countUsersWhere(and(eq(users.role, "resident"), eq(users.documentStatus, "pending"))),
      offerStore.countOffersWhere(eq(offers.archived, false)),
      redemptionStore.countRedemptionsWhere(gte(redemptions.redeemedAt, monthStart)),
    ]);
    res.json({
      residents,
      verifiedResidents,
      activeMembers,
      merchants: merchantCount,
      pendingMerchants,
      pendingDocuments,
      offers: offerCount,
      redemptionsThisMonth,
    });
  }),
);

adminRouter.get(
  "/api/admin/documents/pending",
  asyncHandler(async (_req, res) => {
    const rows = await userStore.listPendingDocuments();
    // Admins need the document itself to review it; the password hash is still removed.
    res.json(rows.map(({ password: _password, ...rest }) => rest));
  }),
);

function parseUserId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw notFound("User not found");
  return id;
}

adminRouter.post(
  "/api/admin/documents/:userId/approve",
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const target = await userStore.getUserById(userId);
    if (!target || target.role !== "resident") throw notFound("User not found");
    if (!target.documentFile) throw badRequest("No document has been submitted");
    const user = await userStore.updateUser(userId, {
      documentStatus: "approved",
      documentReviewedAt: new Date(),
      documentReviewedBy: currentUser(req).id,
      documentRejectionReason: null,
      isResidencyVerified: true,
    });
    if (!user) throw notFound("User not found");
    res.json(toPublicUser(user));
  }),
);

adminRouter.post(
  "/api/admin/documents/:userId/reject",
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const { reason } = parseBody(rejectSchema, req.body);
    const target = await userStore.getUserById(userId);
    if (!target || target.role !== "resident") throw notFound("User not found");
    const user = await userStore.updateUser(userId, {
      documentStatus: "rejected",
      documentReviewedAt: new Date(),
      documentReviewedBy: currentUser(req).id,
      documentRejectionReason: reason,
      isResidencyVerified: false,
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
    res.json(rows.map((r) => ({ ...r.merchant, owner: r.owner, offerCount: r.offerCount })));
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
    res.json(await setMerchantStatus(req.params.id, "approved", currentUser(req).id));
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
