import { Router } from "express";
import { householdJoinSchema, type User } from "@shared/schema";
import { config } from "../config";
import * as userStore from "../storage/users";
import { authenticate, requireRole, currentUser } from "../lib/auth";
import { asyncHandler, parseBody, badRequest, notFound, forbidden } from "../lib/http";
import { residentRedeemReasons } from "../lib/offer-rules";
import { effectiveMembership, householdFeeGbp, isMembershipCurrent, type EffectiveMembership } from "../lib/membership";
import { uniqueHouseholdCode } from "../lib/stripe";

// Household plans: the paying adult is the primary; a second adult joins with the
// primary's code and inherits the primary's membership. The membership payload is
// built here so /api/membership and the household routes return the same shape.

type HouseholdRole = "primary" | "member" | null;

function householdRole(user: User): HouseholdRole {
  if (user.householdPrimaryId) return "member";
  return user.membershipPlan === "household" ? "primary" : null;
}

function memberSummary(u: User) {
  return { id: u.id, firstName: u.firstName, surname: u.surname, isResidencyVerified: Boolean(u.isResidencyVerified) };
}

async function householdPayload(user: User, primary: User | null) {
  const role = householdRole(user);
  const primaryId = role === "member" ? user.householdPrimaryId : role === "primary" ? user.id : null;
  const members = primaryId ? await userStore.listHouseholdMembers(primaryId) : [];
  return {
    role,
    code: role === "primary" ? user.householdCode ?? null : null,
    members: members.map(memberSummary),
    primary: role === "member" && primary ? { firstName: primary.firstName, surname: primary.surname } : null,
  };
}

/** The GET /api/membership response for this user. */
export async function membershipPayload(user: User) {
  const primary = await userStore.getHouseholdPrimary(user);
  const membership: EffectiveMembership = effectiveMembership(user, primary);
  const reasons = residentRedeemReasons(user, membership);
  return {
    plan: membership.plan,
    status: membership.status,
    expiry: membership.expiry,
    fees: { individual: config.residentAnnualFeeGbp, household: householdFeeGbp(config.residentAnnualFeeGbp) },
    currency: "GBP",
    canRedeem: reasons.length === 0,
    reasons,
    household: await householdPayload(user, primary),
  };
}

async function loadResident(id: number): Promise<User> {
  const user = await userStore.getUserById(id);
  if (!user) throw notFound("Account not found");
  return user;
}

/** Why this user cannot join a household right now, or null. */
function joinBlockReason(user: User, primary: User, existingMember: User | undefined): string | null {
  if (primary.id === user.id) return "You cannot join your own household";
  if (primary.membershipPlan !== "household") return "That household plan is not active";
  if (existingMember && existingMember.id !== user.id) return "That household already has a second adult";
  if (user.membershipPlan === "household") return "You already have a household plan of your own";
  if (user.membershipPlan === "individual" && isMembershipCurrent(effectiveMembership(user, null))) {
    return "You already have an active individual membership";
  }
  return null;
}

export const householdRouter = Router();
householdRouter.use("/api/household", authenticate, requireRole("resident"));

householdRouter.post(
  "/api/household/join",
  asyncHandler(async (req, res) => {
    const { code } = parseBody(householdJoinSchema, req.body);
    const user = await loadResident(currentUser(req).id);
    const primary = await userStore.getUserByHouseholdCode(code.trim().toUpperCase());
    if (!primary) throw notFound("Unknown household code");
    const existingMember = await userStore.getHouseholdMember(primary.id);
    const reason = joinBlockReason(user, primary, existingMember);
    if (reason) throw badRequest(reason);
    const updated = await userStore.updateUser(user.id, { householdPrimaryId: primary.id });
    res.json(await membershipPayload(updated ?? user));
  }),
);

householdRouter.post(
  "/api/household/leave",
  asyncHandler(async (req, res) => {
    const user = await loadResident(currentUser(req).id);
    if (!user.householdPrimaryId) throw badRequest("You are not part of another household");
    const updated = await userStore.updateUser(user.id, { householdPrimaryId: null });
    res.json(await membershipPayload(updated ?? user));
  }),
);

householdRouter.delete(
  "/api/household/members/:userId",
  asyncHandler(async (req, res) => {
    const user = await loadResident(currentUser(req).id);
    if (householdRole(user) !== "primary") throw forbidden("Only the household primary can remove members");
    const memberId = Number(req.params.userId);
    const member = Number.isInteger(memberId) ? await userStore.getUserById(memberId) : undefined;
    if (!member || member.householdPrimaryId !== user.id) throw notFound("Household member not found");
    await userStore.updateUser(member.id, { householdPrimaryId: null });
    res.json(await membershipPayload(user));
  }),
);

householdRouter.post(
  "/api/household/code/rotate",
  asyncHandler(async (req, res) => {
    const user = await loadResident(currentUser(req).id);
    if (householdRole(user) !== "primary") throw forbidden("Only the household primary has a code");
    const code = await uniqueHouseholdCode();
    await userStore.updateUser(user.id, { householdCode: code });
    res.json({ code });
  }),
);
