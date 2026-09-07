import { Router } from "express";
import { updateProfileSchema, submitDocumentSchema } from "@shared/schema";
import { config } from "../config";
import * as userStore from "../storage/users";
import { authenticate, requireRole, toPublicUser, currentUser } from "../lib/auth";
import { asyncHandler, parseBody, badRequest, notFound } from "../lib/http";
import { isLocalPostcode, normalisePostcode } from "../lib/postcode";
import { residentRedeemReasons } from "../lib/offer-rules";
import { isStripeConfigured, createMembershipCheckout, activateMembership, cancelSubscription } from "../lib/stripe";

export const profileRouter = Router();

profileRouter.put(
  "/api/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const auth = currentUser(req);
    const input = parseBody(updateProfileSchema, req.body);
    const values: Parameters<typeof userStore.updateUser>[1] = {};
    if (input.firstName !== undefined) values.firstName = input.firstName;
    if (input.surname !== undefined) values.surname = input.surname;
    if (input.profilePhoto !== undefined) values.profilePhoto = input.profilePhoto;
    if (input.postcode !== undefined) {
      if (auth.role === "resident" && !isLocalPostcode(input.postcode)) {
        throw badRequest("Postcode is outside the Resicard area");
      }
      values.postcode = normalisePostcode(input.postcode) ?? input.postcode;
    }
    const user = await userStore.updateUser(auth.id, values);
    if (!user) throw notFound("Account not found");
    res.json(toPublicUser(user));
  }),
);

profileRouter.post(
  "/api/profile/document",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const auth = currentUser(req);
    const input = parseBody(submitDocumentSchema, req.body);
    const current = await userStore.getUserById(auth.id);
    if (!current) throw notFound("Account not found");
    if (current.isResidencyVerified) throw badRequest("Residency is already verified");
    const user = await userStore.updateUser(auth.id, {
      documentType: input.documentType,
      documentFile: input.documentFile,
      documentStatus: "pending",
      documentSubmittedAt: new Date(),
      documentReviewedAt: null,
      documentReviewedBy: null,
      documentRejectionReason: null,
    });
    if (!user) throw notFound("Account not found");
    res.json(toPublicUser(user));
  }),
);

profileRouter.get(
  "/api/membership",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const user = await userStore.getUserById(currentUser(req).id);
    if (!user) throw notFound("Account not found");
    const reasons = residentRedeemReasons(user);
    res.json({
      status: user.membershipStatus ?? "inactive",
      expiry: user.membershipExpiry,
      annualFee: config.residentAnnualFeeGbp,
      currency: "GBP",
      canRedeem: reasons.length === 0,
      reasons,
    });
  }),
);

profileRouter.post(
  "/api/membership/checkout",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const user = await userStore.getUserById(currentUser(req).id);
    if (!user) throw notFound("Account not found");
    if (isStripeConfigured()) {
      res.json({ url: await createMembershipCheckout(user) });
      return;
    }
    await activateMembership(user);
    res.json({ activated: true });
  }),
);

profileRouter.post(
  "/api/membership/cancel",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const user = await userStore.getUserById(currentUser(req).id);
    if (!user) throw notFound("Account not found");
    await cancelSubscription(user.stripeSubscriptionId);
    const updated = await userStore.updateUser(user.id, { membershipStatus: "cancelled", stripeSubscriptionId: null });
    res.json({ status: updated?.membershipStatus ?? "cancelled" });
  }),
);
