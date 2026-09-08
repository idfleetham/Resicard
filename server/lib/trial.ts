// Pure helpers for the free trial and for reading a Stripe renewal invoice.
// No database, no Stripe SDK, so these can be unit tested on their own.

export type TrialSubjectKind = "resident_membership" | "merchant_premium";

/** A trial is only for someone who has never paid; a returning member pays straight away. */
export function trialDaysFrom(hasPaidBefore: boolean, freeTrialDays: number): number {
  if (hasPaidBefore) return 0;
  return freeTrialDays > 0 ? Math.round(freeTrialDays) : 0;
}

export function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/** The fields of a Stripe invoice (plus its subscription metadata) the renewal handler needs. */
export interface InvoiceRenewalInput {
  billingReason: string | null | undefined;
  amountPaidPence: number | null | undefined;
  /** Subscription metadata: the `kind`, `userId` / `merchantId` and `plan` we set at checkout. */
  metadata: Record<string, string> | null | undefined;
  /** End of the period this invoice pays for, in seconds since the epoch. */
  periodEndSeconds: number | null | undefined;
}

export interface InvoiceRenewal {
  kind: "membership" | "merchant_plan";
  userId: number | null;
  merchantId: string | null;
  plan: "individual" | "household" | null;
  /** The merchant tier the subscription was bought on; null on a subscription created before the re-cut. */
  merchantPlan: "standard" | "insight" | null;
  periodEnd: Date;
  amountGbp: number;
}

/**
 * What a paid invoice means for us, or null when it should be ignored:
 * - anything but `subscription_cycle` is a sign-up invoice, already handled by
 *   `checkout.session.completed`, so counting it too would double-count the sale;
 * - a £0 invoice is the one Stripe raises when a trial starts;
 * - a subscription without our metadata is not ours.
 * The same rule covers trial conversion and year-two renewals: both are cycles.
 */
export function renewalFromInvoice(input: InvoiceRenewalInput): InvoiceRenewal | null {
  if (input.billingReason !== "subscription_cycle") return null;
  const pence = input.amountPaidPence ?? 0;
  if (!Number.isFinite(pence) || pence <= 0) return null;
  const seconds = input.periodEndSeconds;
  if (!seconds || !Number.isFinite(seconds)) return null;
  const periodEnd = new Date(seconds * 1000);
  const amountGbp = pence / 100;
  const kind = input.metadata?.kind;

  if (kind === "membership") {
    const userId = Number(input.metadata?.userId);
    if (!Number.isInteger(userId)) return null;
    return {
      kind,
      userId,
      merchantId: null,
      plan: input.metadata?.plan === "household" ? "household" : "individual",
      merchantPlan: null,
      periodEnd,
      amountGbp,
    };
  }
  if (kind === "merchant_plan") {
    const merchantId = input.metadata?.merchantId;
    if (!merchantId) return null;
    const merchantPlan = input.metadata?.plan;
    return {
      kind,
      userId: null,
      merchantId,
      plan: null,
      merchantPlan: merchantPlan === "insight" || merchantPlan === "standard" ? merchantPlan : null,
      periodEnd,
      amountGbp,
    };
  }
  return null;
}
