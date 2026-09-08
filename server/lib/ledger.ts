import type { SubscriptionEvent, User, Merchant } from "@shared/schema";
import * as ledgerStore from "../storage/ledger";
import { log } from "../vite";

/**
 * The subscription ledger: one row per membership activation, renewal or
 * cancellation and per merchant plan change. Amounts are what was (or would be)
 * collected in GBP, so the admin revenue screen can be built from the ledger alone.
 */

export type LedgerKind = SubscriptionEvent["kind"];
export type LedgerAction = SubscriptionEvent["action"];
export type LedgerSource = NonNullable<SubscriptionEvent["source"]>;

export interface SubscriptionEventInput {
  kind: LedgerKind;
  subjectId: string;
  subjectName: string | null;
  plan: "individual" | "household" | "standard" | "insight" | null;
  action: LedgerAction;
  amountGbp: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  source: LedgerSource;
}

export async function recordSubscriptionEvent(input: SubscriptionEventInput): Promise<SubscriptionEvent | null> {
  try {
    return await ledgerStore.insertSubscriptionEvent({
      kind: input.kind,
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      plan: input.plan,
      action: input.action,
      amountGbp: input.amountGbp.toFixed(2),
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      source: input.source,
    });
  } catch (err) {
    // The ledger is reporting only; never let it break a payment flow.
    log(`Ledger write failed for ${input.kind} ${input.subjectId}: ${(err as Error).message}`, "ledger");
    return null;
  }
}

/** "started" for a first period, "renewed" when the subject already had one (active or expired). */
export async function startOrRenew(kind: LedgerKind, subjectId: string, hadPeriodBefore: boolean): Promise<LedgerAction> {
  if (hadPeriodBefore) return "renewed";
  return (await ledgerStore.hasPaidPeriod(kind, subjectId)) ? "renewed" : "started";
}

/**
 * True when this subject has ever been charged anything (any ledger row with an amount
 * above zero). Free trials are written with amount 0, so this is what separates a
 * first-time member, who gets the trial, from a returning one, who pays straight away.
 */
export async function hasEverPaid(kind: LedgerKind, subjectId: string): Promise<boolean> {
  try {
    return await ledgerStore.hasPaidAmount(kind, subjectId);
  } catch (err) {
    // Fail closed: if we cannot tell, do not hand out another trial.
    log(`Ledger read failed for ${kind} ${subjectId}: ${(err as Error).message}`, "ledger");
    return true;
  }
}

export function residentSubjectName(user: User): string {
  return [user.firstName, user.surname].filter(Boolean).join(" ") || user.username || user.email;
}

export function merchantSubjectName(merchant: Merchant): string {
  return merchant.name;
}
