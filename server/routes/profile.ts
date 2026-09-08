import { Router } from "express";
import { updateProfileSchema, membershipCheckoutSchema } from "@shared/schema";
import * as userStore from "../storage/users";
import * as postcardStore from "../storage/postcards";
import { authenticate, requireRole, toPublicUser, currentUser } from "../lib/auth";
import { asyncHandler, parseBody, badRequest, notFound } from "../lib/http";
import { isLocalPostcode, normalisePostcode } from "../lib/postcode";
import {
  isStripeConfigured,
  createMembershipCheckout,
  activateMembershipForCheckout,
  cancelSubscription,
  setCancelAtPeriodEnd,
  recordMembershipEnded,
} from "../lib/stripe";
import { effectiveMembership, isMembershipCurrent } from "../lib/membership";
import { membershipPayload } from "./household";

export const profileRouter = Router();

profileRouter.put(
  "/api/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const auth = currentUser(req);
    const input = parseBody(updateProfileSchema, req.body);
    const current = await userStore.getUserById(auth.id);
    if (!current) throw notFound("Account not found");
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
    if (input.addressLine1 !== undefined) values.addressLine1 = input.addressLine1;
    if (input.addressLine2 !== undefined) values.addressLine2 = input.addressLine2 ?? null;
    if (input.town !== undefined) values.town = input.town;

    // Residents who change their address must verify again, and any postcard in flight
    // would go to the old address, so it is cancelled.
    const addressChanged =
      auth.role === "resident" &&
      (["addressLine1", "addressLine2", "town", "postcode"] as const).some(
        (key) => values[key] !== undefined && (values[key] ?? null) !== (current[key] ?? null),
      );
    if (addressChanged) {
      await postcardStore.cancelOpenPostcards(auth.id);
      if (current.isResidencyVerified) {
        values.isResidencyVerified = false;
        values.verifiedAt = null;
        values.verifiedBy = null;
        values.verificationMethod = null;
      }
    }
    const user = await userStore.updateUser(auth.id, values);
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
    await activateMembershipForCheckout(user, plan);
    res.json({ activated: true });
  }),
);

/** The signed-in resident, who must own their membership (not a household member). */
async function ownMembershipUser(req: Parameters<typeof currentUser>[0]) {
  const user = await userStore.getUserById(currentUser(req).id);
  if (!user) throw notFound("Account not found");
  if (user.householdPrimaryId) throw badRequest("Your membership is managed by your household primary");
  return user;
}

profileRouter.post(
  "/api/membership/downgrade",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const user = await ownMembershipUser(req);
    if (!isMembershipCurrent(effectiveMembership(user, null))) throw badRequest("You do not have a Premium membership to move from");
    if (user.membershipRenews !== false) {
      await setCancelAtPeriodEnd(user.stripeSubscriptionId, true);
      await userStore.updateUser(user.id, { membershipRenews: false });
      await recordMembershipEnded(user, "cancelled", user.stripeSubscriptionId ? "stripe" : "dev");
    }
    const updated = await userStore.getUserById(user.id);
    res.json(await membershipPayload(updated ?? user));
  }),
);

profileRouter.post(
  "/api/membership/resume",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const user = await ownMembershipUser(req);
    if (!isMembershipCurrent(effectiveMembership(user, null))) throw badRequest("Your membership has already ended");
    if (user.membershipRenews === false) {
      await setCancelAtPeriodEnd(user.stripeSubscriptionId, false);
      await userStore.updateUser(user.id, { membershipRenews: true });
    }
    const updated = await userStore.getUserById(user.id);
    res.json(await membershipPayload(updated ?? user));
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
    if (user.membershipStatus === "active") await recordMembershipEnded(user, "cancelled", user.stripeSubscriptionId ? "stripe" : "dev");
    res.json({ status: updated?.membershipStatus ?? "cancelled" });
  }),
);
