import { describe, it, expect } from "vitest";
import { HUMAN_ALPHABET } from "../codes";
import {
  VERIFICATION_CODE_LENGTH,
  codeBlockReason,
  isVerificationCodeShaped,
  newVerificationCode,
  normaliseVerificationCode,
  outletVerifyBlockReason,
} from "../outlet-verification";

describe("verification codes", () => {
  it("are six characters from the human alphabet", () => {
    for (let i = 0; i < 20; i++) {
      const code = newVerificationCode();
      expect(code).toHaveLength(VERIFICATION_CODE_LENGTH);
      for (const ch of code) expect(HUMAN_ALPHABET).toContain(ch);
      expect(isVerificationCodeShaped(code)).toBe(true);
    }
  });

  it("ignore case and spacing, because staff read them off a phone", () => {
    expect(normaliseVerificationCode(" ab c de f ")).toBe("ABCDEF");
    expect(normaliseVerificationCode("abcdef")).toBe("ABCDEF");
    expect(isVerificationCodeShaped(" bc dpq r ")).toBe(true);
  });

  it("reject anything that is not a code", () => {
    expect(isVerificationCodeShaped("ABCDE")).toBe(false);
    expect(isVerificationCodeShaped("ABCDEFG")).toBe(false);
    // 0, O, 1 and I are not in the alphabet: they are the characters people misread.
    expect(isVerificationCodeShaped("ABC0EF")).toBe(false);
    expect(isVerificationCodeShaped("ABC-EF")).toBe(false);
  });
});

describe("which outlets may verify", () => {
  it("allows only an approved outlet an admin has switched on", () => {
    expect(outletVerifyBlockReason({ status: "approved", verifiesResidents: true })).toBeNull();
  });

  it("refuses an outlet that has not been switched on", () => {
    expect(outletVerifyBlockReason({ status: "approved", verifiesResidents: false })).toBe(
      "Your outlet is not set up to verify residents",
    );
    // The column default: nothing is granted by omission.
    expect(outletVerifyBlockReason({ status: "approved" })).not.toBeNull();
  });

  it("refuses an outlet that is not approved, however it is flagged", () => {
    expect(outletVerifyBlockReason({ status: "pending", verifiesResidents: true })).toBe("Your outlet is not approved yet");
    expect(outletVerifyBlockReason({ status: "rejected", verifiesResidents: true })).not.toBeNull();
  });
});

describe("which codes open anything", () => {
  it("accepts an unverified resident's code", () => {
    expect(codeBlockReason({ role: "resident", isResidencyVerified: false })).toBeNull();
  });

  it("refuses a code no account holds", () => {
    // Nobody holds it: either it was never issued, or it was used and cleared.
    expect(codeBlockReason(undefined)).toBe("That code was not recognised");
  });

  it("refuses a code that has already been used", () => {
    // Verifying clears the code, so a second attempt normally finds nobody at
    // all; an account verified another way while still holding one is told plainly.
    expect(codeBlockReason({ role: "resident", isResidencyVerified: true })).toBe("That code has already been used");
  });

  it("refuses a code held by anyone who is not a resident", () => {
    expect(codeBlockReason({ role: "merchant", isResidencyVerified: false })).toBe("That code was not recognised");
  });
});
