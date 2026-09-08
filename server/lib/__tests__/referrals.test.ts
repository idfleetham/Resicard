import { describe, it, expect } from "vitest";
import {
  canAcceptReferral,
  canCreditReferrer,
  capMonthsLeft,
  monthsEarnedInWindow,
  normaliseReferralCode,
  randomReferralCode,
  referralShareLink,
  referredBonusMonths,
  sameHousehold,
  REFERRAL_CAP_MONTHS,
  REFERRAL_CODE_LENGTH,
} from "../referrals";
import { HUMAN_ALPHABET } from "../codes";

const now = new Date("2026-09-08T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

describe("referral codes", () => {
  it("draws from the human alphabet so a code can be read out", () => {
    for (let i = 0; i < 20; i++) {
      const code = randomReferralCode();
      expect(code).toHaveLength(REFERRAL_CODE_LENGTH);
      expect([...code].every((c) => HUMAN_ALPHABET.includes(c))).toBe(true);
    }
  });

  it("ignores case, spaces and punctuation when a code is typed", () => {
    expect(normaliseReferralCode(" ab-cd 23 ")).toBe("ABCD23");
    expect(normaliseReferralCode("")).toBe("");
  });

  it("builds a share link that fills the code in at registration", () => {
    expect(referralShareLink("https://resicard.co.uk/", "ABCD2345")).toBe("https://resicard.co.uk/register?ref=ABCD2345");
  });
});

describe("who may refer whom", () => {
  it("refuses a member referring themselves", () => {
    expect(canAcceptReferral({ id: 1 }, { id: 1 })).toEqual({ ok: false, reason: "self_referral" });
  });

  it("refuses a referral into the referrer's own household", () => {
    expect(canAcceptReferral({ id: 1 }, { id: 2, householdPrimaryId: 1 })).toEqual({ ok: false, reason: "same_household" });
    expect(canAcceptReferral({ id: 2, householdPrimaryId: 1 }, { id: 1 })).toEqual({ ok: false, reason: "same_household" });
    expect(canAcceptReferral({ id: 2, householdPrimaryId: 9 }, { id: 3, householdPrimaryId: 9 })).toEqual({
      ok: false,
      reason: "same_household",
    });
  });

  it("allows two unrelated members", () => {
    expect(canAcceptReferral({ id: 1 }, { id: 2 })).toEqual({ ok: true });
    expect(sameHousehold({ id: 1 }, { id: 2 })).toBe(false);
    expect(sameHousehold({ id: 1, householdPrimaryId: null }, { id: 2, householdPrimaryId: null })).toBe(false);
  });
});

describe("the six months in twelve cap", () => {
  it("counts only credits inside the rolling window", () => {
    const credits = [daysAgo(10), daysAgo(200), daysAgo(400), null];
    expect(monthsEarnedInWindow(credits, now)).toBe(2);
    expect(capMonthsLeft(credits, now)).toBe(REFERRAL_CAP_MONTHS - 2);
  });

  it("refuses a seventh month in the same year", () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => daysAgo(n * 10));
    expect(capMonthsLeft(six, now)).toBe(0);
    expect(canCreditReferrer({ id: 1 }, { id: 2 }, six, now)).toEqual({ ok: false, reason: "cap_reached" });
  });

  it("lets the cap free up as old credits fall out of the window", () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => daysAgo(n === 1 ? 400 : n * 10));
    expect(canCreditReferrer({ id: 1 }, { id: 2 }, six, now)).toEqual({ ok: true });
  });

  it("still refuses a self or household referral at crediting time", () => {
    expect(canCreditReferrer({ id: 1 }, { id: 1 }, [], now)).toEqual({ ok: false, reason: "self_referral" });
    expect(canCreditReferrer({ id: 1 }, { id: 2, householdPrimaryId: 1 }, [], now)).toEqual({ ok: false, reason: "same_household" });
  });
});

describe("the referred member's month", () => {
  const periodStart = new Date("2026-09-01T00:00:00Z");

  it("is due on the payment that credited the referral", () => {
    expect(referredBonusMonths(new Date("2026-09-08T00:00:00Z"), periodStart)).toBe(1);
  });

  it("is due again if the same invoice arrives twice, so the expiry is the same either way", () => {
    const creditedAt = new Date("2026-09-08T00:00:00Z");
    expect(referredBonusMonths(creditedAt, periodStart)).toBe(referredBonusMonths(creditedAt, periodStart));
  });

  it("is not due on the year two renewal", () => {
    const yearTwoStart = new Date("2027-09-01T00:00:00Z");
    expect(referredBonusMonths(new Date("2026-09-08T00:00:00Z"), yearTwoStart)).toBe(0);
  });

  it("is nothing when there is no referral", () => {
    expect(referredBonusMonths(null, periodStart)).toBe(0);
  });
});
