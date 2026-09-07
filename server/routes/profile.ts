import { Router } from "express";
import { updateProfileSchema, submitDocumentSchema, membershipCheckoutSchema } from "@shared/schema";
import * as userStore from "../storage/users";
import { authenticate, requireRole, toPublicUser, currentUser } from "../lib/auth";
import { asyncHandler, parseBody, badRequest, notFound } from "../lib/http";
import { isLocalPostcode, normalisePostcode } from "../lib/postcode";
import { isStripeConfigured, createMembershipCheckout, activateMembership, cancelSubscription } from "../lib/stripe";
import { membershipPayload } from "./household";

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
    res.json(await membershipPayload(user));
  }),
);

profileRouter.post(
  "/api/membership/checkout",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const { plan } = parseBody(membershipCheckoutSchema, req.body ?? {});
    const user = await userStore.getUserById(currentUser(req).id);
    if (!user) throw notFound("Account not found");
    if (user.householdPrimaryId) throw badRequest("You are covered by another household");
    if (plan === "individual" && user.membershipPlan === "household" && (await userStore.getHouseholdMember(user.id))) {
      throw badRequest("Remove the second adult from your household before switching to an individual plan");
    }
    if (isStripeConfigured()) {
      res.json({ url: await createMembershipCheckout(user, plan) });
      return;
    }
    await activateMembership(user, plan);
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
    if (user.householdPrimaryId) throw badRequest("Your membership is managed by your household primary");
    await cancelSubscription(user.stripeSubscriptionId);
    // Household members keep householdPrimaryId; their derived status follows this row.
    const updated = await userStore.updateUser(user.id, { membershipStatus: "cancelled", stripeSubscriptionId: null });
    res.json({ status: updated?.membershipStatus ?? "cancelled" });
  }),
);
