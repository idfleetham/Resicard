import { Router } from "express";
import { config } from "../config";
import * as userStore from "../storage/users";
import * as referralStore from "../storage/referrals";
import { authenticate, requireRole, currentUser } from "../lib/auth";
import { asyncHandler, notFound } from "../lib/http";
import { ensureReferralCode } from "../lib/referral-service";
import {
  capMonthsLeft,
  monthsEarnedInWindow,
  referralShareLink,
  REFERRAL_CAP_MONTHS,
  REFERRAL_MONTHS,
} from "../lib/referrals";

export const referralsRouter = Router();
referralsRouter.use("/api/referrals", authenticate, requireRole("resident"));

referralsRouter.get(
  "/api/referrals/mine",
  asyncHandler(async (req, res) => {
    const user = await userStore.getUserById(currentUser(req).id);
    if (!user) throw notFound("Account not found");
    const code = await ensureReferralCode(user);
    const referrals = await referralStore.listReferralsByReferrer(user.id);
    const credited = referrals.filter((r) => r.status === "credited");
    res.json({
      code,
      shareLink: referralShareLink(config.publicBaseUrl, code),
      pending: referrals.length - credited.length,
      credited: credited.length,
      monthsPerReferral: REFERRAL_MONTHS,
      monthsEarned: monthsEarnedInWindow(credited.map((r) => r.creditedAt)),
      monthsLeft: capMonthsLeft(credited.map((r) => r.creditedAt)),
      capMonths: REFERRAL_CAP_MONTHS,
    });
  }),
);
