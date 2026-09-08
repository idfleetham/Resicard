import { describe, it, expect } from "vitest";
import { addDays, renewalFromInvoice, trialDaysFrom, type InvoiceRenewalInput } from "../trial";

describe("trialDaysFrom", () => {
  it("gives the configured trial to someone who has never paid", () => {
    expect(trialDaysFrom(false, 90)).toBe(90);
  });

  it("gives nothing to a returning member who has paid before", () => {
    expect(trialDaysFrom(true, 90)).toBe(0);
  });

  it("gives nothing when trials are switched off", () => {
    expect(trialDaysFrom(false, 0)).toBe(0);
    expect(trialDaysFrom(false, -30)).toBe(0);
  });

  it("rounds a fractional configured length", () => {
    expect(trialDaysFrom(false, 90.4)).toBe(90);
  });
});

describe("addDays", () => {
  it("adds days without changing the original date", () => {
    const from = new Date("2026-09-07T12:00:00Z");
    expect(addDays(from, 90).toISOString()).toBe("2026-12-06T12:00:00.000Z");
    expect(from.toISOString()).toBe("2026-09-07T12:00:00.000Z");
  });
});

const periodEnd = Math.floor(new Date("2027-12-06T12:00:00Z").getTime() / 1000);

function invoice(partial: Partial<InvoiceRenewalInput> = {}): InvoiceRenewalInput {
  return {
    billingReason: "subscription_cycle",
    amountPaidPence: 3000,
    metadata: { kind: "membership", userId: "42", plan: "individual" },
    periodEndSeconds: periodEnd,
    ...partial,
  };
}

describe("renewalFromInvoice", () => {
  it("reads a resident renewal, with the amount actually paid", () => {
    expect(renewalFromInvoice(invoice())).toEqual({
      kind: "membership",
      userId: 42,
      merchantId: null,
      plan: "individual",
      periodEnd: new Date("2027-12-06T12:00:00Z"),
      amountGbp: 30,
    });
  });

  it("reads a household renewal", () => {
    const result = renewalFromInvoice(invoice({ metadata: { kind: "membership", userId: "7", plan: "household" }, amountPaidPence: 6000 }));
    expect(result?.plan).toBe("household");
    expect(result?.amountGbp).toBe(60);
  });

  it("reads a merchant plan renewal", () => {
    const result = renewalFromInvoice(invoice({ metadata: { kind: "merchant_plan", merchantId: "m-1" } }));
    expect(result).toMatchObject({ kind: "merchant_plan", merchantId: "m-1", userId: null, plan: null, amountGbp: 30 });
  });

  it("ignores the zero-pound invoice that starts a trial", () => {
    expect(renewalFromInvoice(invoice({ amountPaidPence: 0 }))).toBeNull();
  });

  it("ignores the sign-up invoice, which checkout.session.completed already handled", () => {
    expect(renewalFromInvoice(invoice({ billingReason: "subscription_create" }))).toBeNull();
    expect(renewalFromInvoice(invoice({ billingReason: "subscription_update" }))).toBeNull();
    expect(renewalFromInvoice(invoice({ billingReason: null }))).toBeNull();
  });

  it("ignores subscriptions that are not ours", () => {
    expect(renewalFromInvoice(invoice({ metadata: null }))).toBeNull();
    expect(renewalFromInvoice(invoice({ metadata: { kind: "something_else" } }))).toBeNull();
  });

  it("ignores a renewal it cannot attribute to a subject", () => {
    expect(renewalFromInvoice(invoice({ metadata: { kind: "membership", userId: "not-a-number" } }))).toBeNull();
    expect(renewalFromInvoice(invoice({ metadata: { kind: "merchant_plan" } }))).toBeNull();
  });

  it("ignores an invoice with no period end to extend to", () => {
    expect(renewalFromInvoice(invoice({ periodEndSeconds: null }))).toBeNull();
  });
});
