import { describe, it, expect } from "vitest";
import { estimateSaving, needsIndicativeValue, summariseSavings, type SavingOffer } from "../savings";

const offer = (over: Partial<SavingOffer>): SavingOffer => ({
  type: "percentage_discount",
  percentOff: null,
  fixedPrice: null,
  originalValue: null,
  typicalSpend: null,
  itemValue: null,
  maxDiscount: null,
  ...over,
});

describe("estimateSaving", () => {
  it("uses the real bill when there is one, and does not call it an estimate", () => {
    const o = offer({ type: "percentage_discount", percentOff: 20, typicalSpend: "30.00" });
    expect(estimateSaving(o, 48.5)).toEqual({ amount: 9.7, estimated: false });
  });

  it("falls back to the merchant's typical bill and marks it estimated", () => {
    const o = offer({ type: "percentage_discount", percentOff: 20, typicalSpend: "30.00" });
    expect(estimateSaving(o, null)).toEqual({ amount: 6, estimated: true });
  });

  it("records nothing rather than guessing when a percentage offer has no indicative figure", () => {
    expect(estimateSaving(offer({ percentOff: 20 }), null)).toEqual({ amount: null, estimated: true });
  });

  it("applies the merchant's maximum discount", () => {
    const o = offer({ type: "percentage_discount", percentOff: 50, maxDiscount: "10.00" });
    expect(estimateSaving(o, 60)).toEqual({ amount: 10, estimated: false });
  });

  it("never claims a saving larger than the bill", () => {
    const o = offer({ type: "free_item_with_purchase", itemValue: "12.00" });
    expect(estimateSaving(o, 5)).toEqual({ amount: 5, estimated: true });
  });

  it("treats money off as the saving itself", () => {
    expect(estimateSaving(offer({ type: "fixed_amount_discount", fixedPrice: "5.00" }), null)).toEqual({
      amount: 5,
      estimated: false,
    });
  });

  it("uses the gap between usual price and offer price for a set menu", () => {
    const o = offer({ type: "set_menu", fixedPrice: "22.00", originalValue: "31.50" });
    expect(estimateSaving(o, null)).toEqual({ amount: 9.5, estimated: false });
  });

  it("ignores a set menu priced at or above its usual price", () => {
    const o = offer({ type: "fixed_price", fixedPrice: "30.00", originalValue: "28.00" });
    expect(estimateSaving(o, null)).toEqual({ amount: null, estimated: true });
  });

  it("counts one item for two for one", () => {
    expect(estimateSaving(offer({ type: "bogo", itemValue: "6.50" }), null)).toEqual({ amount: 6.5, estimated: true });
  });

  it("rejects zero and negative indicative figures", () => {
    expect(estimateSaving(offer({ type: "bogo", itemValue: "0" }), null).amount).toBeNull();
    expect(estimateSaving(offer({ type: "percentage_discount", percentOff: 0, typicalSpend: "20" }), null).amount).toBeNull();
  });

  it("rounds to the penny", () => {
    const o = offer({ type: "percentage_discount", percentOff: 15, typicalSpend: "27.99" });
    expect(estimateSaving(o, null).amount).toBe(4.2);
  });
});

describe("needsIndicativeValue", () => {
  it("names the field a merchant has to fill in for the saving to count", () => {
    expect(needsIndicativeValue("percentage_discount")).toBe("typicalSpend");
    expect(needsIndicativeValue("off_peak")).toBe("typicalSpend");
    expect(needsIndicativeValue("bogo")).toBe("itemValue");
    expect(needsIndicativeValue("set_menu")).toBeNull();
    expect(needsIndicativeValue("fixed_amount_discount")).toBeNull();
  });
});

const row = (amount: number | null, iso: string, estimated = true) => ({
  savedAmount: amount,
  savedEstimated: estimated,
  redeemedAt: new Date(iso),
});

describe("summariseSavings", () => {
  it("returns an empty summary when nothing could be estimated", () => {
    const s = summariseSavings([row(null, "2026-03-04"), row(null, "2026-04-01")], new Date("2026-05-01"));
    expect(s).toMatchObject({ total: 0, counted: 0, uncounted: 2, months: [], averageMonthly: 0, firstAt: null });
  });

  it("totals only the rows with a figure and reports the rest as uncounted", () => {
    const s = summariseSavings(
      [row(10, "2026-03-04"), row(null, "2026-03-06"), row(5.5, "2026-03-20")],
      new Date("2026-03-31"),
    );
    expect(s.total).toBe(15.5);
    expect(s.counted).toBe(2);
    expect(s.uncounted).toBe(1);
  });

  it("fills quiet months with zero rather than closing the gap", () => {
    const s = summariseSavings([row(12, "2026-01-10"), row(8, "2026-04-02")], new Date("2026-04-20"));
    expect(s.months.map((m) => m.month)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(s.months.map((m) => m.amount)).toEqual([12, 0, 0, 8]);
    expect(s.averageMonthly).toBe(5);
  });

  it("rolls over the year end", () => {
    const s = summariseSavings([row(4, "2025-11-05"), row(6, "2026-01-05")], new Date("2026-01-09"));
    expect(s.months.map((m) => m.month)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("separates the part of the total that rests on indicative figures", () => {
    const s = summariseSavings([row(10, "2026-03-04", true), row(20, "2026-03-05", false)], new Date("2026-03-31"));
    expect(s.total).toBe(30);
    expect(s.estimatedPortion).toBe(10);
  });
});
