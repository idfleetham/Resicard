// Inserts "started" ledger rows (source backfill) for currently active memberships
// and premium merchants that have no subscription_events yet. Safe to re-run:
// subjects with any existing event are skipped. Usage: npm run ledger:backfill
import { pool } from "../db";
import { config } from "../config";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import * as ledgerStore from "../storage/ledger";
import { planFeeGbp } from "../lib/membership";
import { recordSubscriptionEvent, residentSubjectName, merchantSubjectName } from "../lib/ledger";
import { addMonths } from "../lib/stripe";

async function main(): Promise<void> {
  const now = new Date();
  let residentsAdded = 0;
  let merchantsAdded = 0;

  const seenResidents = await ledgerStore.subjectIdsWithEvents("resident_membership");
  for (const user of await userStore.listUsers("resident")) {
    if (user.membershipStatus !== "active" || user.householdPrimaryId) continue;
    if (!user.membershipExpiry || user.membershipExpiry.getTime() <= now.getTime()) continue;
    if (seenResidents.has(String(user.id))) continue;
    const plan = user.membershipPlan === "household" ? "household" : "individual";
    const periodStart = addMonths(user.membershipExpiry, -12);
    const row = await recordSubscriptionEvent({
      kind: "resident_membership",
      subjectId: String(user.id),
      subjectName: residentSubjectName(user),
      plan,
      action: "started",
      amountGbp: planFeeGbp(plan, config.residentAnnualFeeGbp),
      periodStart,
      periodEnd: user.membershipExpiry,
      source: "backfill",
    });
    if (row) residentsAdded++;
  }

  const seenMerchants = await ledgerStore.subjectIdsWithEvents("merchant_premium");
  for (const { merchant } of await merchantStore.listMerchantsForAdmin(undefined)) {
    if (merchant.planStatus !== "premium" || seenMerchants.has(merchant.id)) continue;
    const periodStart = merchant.planStartedAt ?? now;
    const row = await recordSubscriptionEvent({
      kind: "merchant_premium",
      subjectId: merchant.id,
      subjectName: merchantSubjectName(merchant),
      plan: "premium",
      action: "started",
      amountGbp: config.merchantPremiumMonthlyFeeGbp,
      periodStart,
      periodEnd: merchant.planRenewsAt ?? addMonths(periodStart, 1),
      source: "backfill",
    });
    if (row) merchantsAdded++;
  }

  console.log(`Backfill complete: ${residentsAdded} resident membership(s), ${merchantsAdded} premium merchant(s) added.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
