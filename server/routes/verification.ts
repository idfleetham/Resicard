import { Router } from "express";
import { postcardCodeSchema, type Postcard, type User } from "@shared/schema";
import { config } from "../config";
import * as userStore from "../storage/users";
import * as postcardStore from "../storage/postcards";
import { authenticate, requireRole, currentUser } from "../lib/auth";
import { asyncHandler, parseBody, badRequest, notFound } from "../lib/http";
import { attemptsLeft, expiryDate, formatAddress, hashCode, isAddressComplete, isExpired, newPostcardCode } from "../lib/postcards";
import { emailService } from "../email";
import { dedupeKeys, sendOnce } from "../lib/mailer";

export const verificationRouter = Router();
verificationRouter.use("/api/verification", authenticate, requireRole("resident"));

function postcardPayload(p: Postcard | undefined) {
  if (!p) return null;
  return {
    status: p.status,
    requestedAt: p.requestedAt,
    postedAt: p.postedAt,
    expiresAt: p.status === "posted" ? p.expiresAt : null,
    attemptsLeft: p.status === "posted" ? attemptsLeft(p.attempts, config.postcardMaxAttempts) : null,
  };
}

/** The GET /api/verification shape, shared by every route here. */
export async function verificationPayload(user: User, reason?: string) {
  let latest = await postcardStore.getLatestPostcardForUser(user.id);
  // A posted card that has run out of time is reported as expired the next time anyone looks.
  if (latest?.status === "posted" && isExpired(latest.expiresAt)) {
    latest = (await postcardStore.updatePostcard(latest.id, { status: "expired" })) ?? latest;
  }
  const open = latest && (latest.status === "requested" || latest.status === "posted") ? latest : undefined;
  const addressComplete = isAddressComplete(user);
  let blocked: string | undefined = reason;
  if (user.isResidencyVerified) blocked ??= "Your address is already verified";
  else if (open) blocked ??= open.status === "requested" ? "A postcard is already being prepared" : "A postcard is already on its way";
  else if (!addressComplete) blocked ??= "Add your full address first";
  return {
    verified: Boolean(user.isResidencyVerified),
    verifiedAt: user.verifiedAt,
    method: user.verificationMethod ?? null,
    address: {
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      town: user.town,
      postcode: user.postcode,
    },
    postcard: postcardPayload(latest),
    // What each route involves, so the chooser never hard-codes 60 days, 5 tries
    // or a meeting place that only exists in this deployment's configuration.
    options: {
      postcardCodeDays: config.postcardCodeDays,
      postcardMaxAttempts: config.postcardMaxAttempts,
      inPersonDetails: config.verifyInPersonDetails,
    },
    canRequestPostcard: !blocked,
    ...(blocked ? { reason: blocked } : {}),
  };
}

async function loadResident(id: number): Promise<User> {
  const user = await userStore.getUserById(id);
  if (!user) throw notFound("Account not found");
  return user;
}

verificationRouter.get(
  "/api/verification",
  asyncHandler(async (req, res) => {
    res.json(await verificationPayload(await loadResident(currentUser(req).id)));
  }),
);

verificationRouter.post(
  "/api/verification/postcard",
  asyncHandler(async (req, res) => {
    const user = await loadResident(currentUser(req).id);
    if (user.isResidencyVerified) throw badRequest("Your address is already verified");
    if (!isAddressComplete(user)) throw badRequest("Add your full address before requesting a postcard");
    if (await postcardStore.getOpenPostcardForUser(user.id)) throw badRequest("A postcard has already been requested");
    // The real code is generated when the admin posts the card; until then the row holds a
    // throwaway hash so nothing can be entered against it.
    await postcardStore.createPostcard({
      userId: user.id,
      codeHash: hashCode(newPostcardCode()),
      addressSnapshot: formatAddress(user),
      expiresAt: expiryDate(config.postcardCodeDays),
    });
    res.status(201).json(await verificationPayload(user));
  }),
);

verificationRouter.post(
  "/api/verification/postcard/code",
  asyncHandler(async (req, res) => {
    const { code } = parseBody(postcardCodeSchema, req.body);
    const user = await loadResident(currentUser(req).id);
    if (user.isResidencyVerified) throw badRequest("Your address is already verified");
    const open = await postcardStore.getOpenPostcardForUser(user.id);
    if (!open || open.status !== "posted") throw badRequest("No postcard has been posted to you yet");
    if (isExpired(open.expiresAt)) {
      await postcardStore.updatePostcard(open.id, { status: "expired" });
      throw badRequest("That code has expired. Request another postcard.");
    }
    if (hashCode(code) !== open.codeHash) {
      const attempts = (open.attempts ?? 0) + 1;
      const left = attemptsLeft(attempts, config.postcardMaxAttempts);
      await postcardStore.updatePostcard(open.id, { attempts, ...(left === 0 ? { status: "cancelled" as const } : {}) });
      if (left === 0) throw badRequest("Wrong code, no attempts left. Request another postcard.");
      throw badRequest(`Wrong code, ${left} attempt${left === 1 ? "" : "s"} left`);
    }
    const now = new Date();
    await postcardStore.updatePostcard(open.id, { status: "used", usedAt: now });
    const updated = await userStore.updateUser(user.id, {
      isResidencyVerified: true,
      verifiedAt: now,
      verifiedBy: null,
      verificationMethod: "postcard",
    });
    await sendOnce(user.id, "verified", dedupeKeys.verified(user.id), () =>
      emailService.sendVerified(user.email, user.firstName),
    );
    res.json(await verificationPayload(updated ?? user));
  }),
);
