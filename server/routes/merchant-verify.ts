import { Router } from "express";
import { outletVerifySchema, verificationCodeSchema, type Merchant, type User } from "@shared/schema";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import * as postcardStore from "../storage/postcards";
import { authenticate, requireRole, currentUser, currentMerchantId } from "../lib/auth";
import { asyncHandler, parseBody, notFound, forbidden } from "../lib/http";
import { codeBlockReason, normaliseVerificationCode, outletVerifyBlockReason } from "../lib/outlet-verification";
import { emailService } from "../email";
import { dedupeKeys, sendOnce } from "../lib/mailer";
import { log } from "../vite";

/**
 * Verification at a participating outlet.
 *
 * A resident shows the code from their app along with something carrying their
 * name and address. Staff type the code, read the account's address off the
 * screen, and confirm it matches the letter in front of them. Nothing is
 * scanned, copied or kept.
 *
 * This is the one place a merchant sees a resident's name and address, so it is
 * kept narrow on purpose: only an outlet an admin has switched on can call it,
 * only a code the resident handed over opens anything, there is no way to browse
 * or search residents, and nothing beyond what is needed to check a letter comes
 * back. Every lookup and every verification is written to the server log with
 * the outlet and the staff account behind it.
 */
export const merchantVerifyRouter = Router();
merchantVerifyRouter.use("/api/merchant/verify", authenticate, requireRole("merchant"));

/** The outlet, once it has been confirmed it may verify anyone at all. */
async function verifyingOutlet(req: Parameters<typeof currentMerchantId>[0]): Promise<Merchant> {
  const merchant = await merchantStore.getMerchantById(currentMerchantId(req));
  if (!merchant) throw notFound("Merchant not found");
  const blocked = outletVerifyBlockReason(merchant);
  if (blocked) throw forbidden(blocked);
  return merchant;
}

/** The resident holding this code, or a 404 that does not say which of the two reasons applies. */
async function residentForCode(raw: string): Promise<User> {
  const code = normaliseVerificationCode(raw);
  const holder = await userStore.getUserByVerificationCode(code);
  const blocked = codeBlockReason(holder);
  if (blocked || !holder) throw notFound(blocked ?? "That code was not recognised");
  return holder;
}

/** Exactly what staff need to check a letter: a name and an address. No email, no membership, nothing else. */
function letterCheck(user: User) {
  return {
    firstName: user.firstName,
    surname: user.surname,
    addressLine1: user.addressLine1,
    town: user.town,
    postcode: user.postcode,
  };
}

merchantVerifyRouter.get(
  "/api/merchant/verify/:code",
  asyncHandler(async (req, res) => {
    const merchant = await verifyingOutlet(req);
    const resident = await residentForCode(req.params.code);
    log(`verify lookup: outlet ${merchant.id} staff ${currentUser(req).id} resident ${resident.id}`);
    res.json(letterCheck(resident));
  }),
);

merchantVerifyRouter.post(
  "/api/merchant/verify",
  asyncHandler(async (req, res) => {
    const merchant = await verifyingOutlet(req);
    const { code } = parseBody(outletVerifySchema, req.body);
    const resident = await residentForCode(code);
    const staffId = currentUser(req).id;

    // A card already in the post is cancelled: the address is confirmed, so
    // there is nothing left for the postage to buy.
    await postcardStore.cancelOpenPostcards(resident.id);
    const verifiedAt = new Date();
    const updated = await userStore.updateUser(resident.id, {
      isResidencyVerified: true,
      verifiedAt,
      verifiedBy: staffId,
      verifiedByMerchantId: merchant.id,
      verificationMethod: "outlet",
      // Cleared, so the code that granted residency can never be used again.
      verificationCode: null,
    });
    log(`verify: outlet ${merchant.id} staff ${staffId} verified resident ${resident.id}`);
    await sendOnce(resident.id, "verified", dedupeKeys.verified(resident.id), () =>
      emailService.sendVerified(resident.email, resident.firstName),
    );
    res.json({
      verified: true,
      verifiedAt,
      resident: letterCheck(updated ?? resident),
      outlet: { id: merchant.id, name: merchant.name },
    });
  }),
);
