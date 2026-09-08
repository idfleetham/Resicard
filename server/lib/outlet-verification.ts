import { HUMAN_ALPHABET, randomCode } from "./codes";

// Pure helpers for verification at a participating outlet: the resident's code,
// and the two checks the merchant endpoints apply. Nothing here touches the
// database, so the rules can be read and tested on their own.

export const VERIFICATION_CODE_LENGTH = 6;

/** A fresh code from the human-readable alphabet (no 0/O/1/I), the same shape as a postcard code. */
export function newVerificationCode(): string {
  return randomCode(VERIFICATION_CODE_LENGTH, HUMAN_ALPHABET);
}

/** Codes are read off a phone screen and typed in, so case and spacing are ignored. */
export function normaliseVerificationCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export function isVerificationCodeShaped(code: string): boolean {
  const clean = normaliseVerificationCode(code);
  return clean.length === VERIFICATION_CODE_LENGTH && clean.split("").every((ch) => HUMAN_ALPHABET.includes(ch));
}

export interface VerifyingOutlet {
  status?: string | null;
  verifiesResidents?: boolean | null;
}

/**
 * Why this outlet may not verify anyone, or null when it may.
 *
 * Verifying delegates the right to grant residency, so it is granted per outlet
 * by an admin and only to an outlet that is actually trading here.
 */
export function outletVerifyBlockReason(outlet: VerifyingOutlet): string | null {
  if (outlet.status !== "approved") return "Your outlet is not approved yet";
  if (!outlet.verifiesResidents) return "Your outlet is not set up to verify residents";
  return null;
}

export interface CodeHolder {
  isResidencyVerified?: boolean | null;
  role?: string | null;
}

/**
 * Why a code cannot be used, or null when it can. `undefined` means no account
 * holds it: either it was never issued, or it has been used and cleared.
 *
 * A used code cannot come back: it is removed from the account the moment it
 * grants residency, so a second attempt finds nobody. The verified case is here
 * for the window where an account was verified another way while holding a code.
 */
export function codeBlockReason(holder: CodeHolder | undefined): string | null {
  if (!holder || holder.role !== "resident") return "That code was not recognised";
  if (holder.isResidencyVerified) return "That code has already been used";
  return null;
}
