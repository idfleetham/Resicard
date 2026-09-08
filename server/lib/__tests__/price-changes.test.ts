import { describe, it, expect } from "vitest";
import { diffPriceFields, percentMove, type PriceFields } from "../price-changes";

const offer = (over: PriceFields): PriceFields => ({
  percentOff: null,
  fixedPrice: null,
  originalValue: null,
  typicalSpend: null,
  itemValue: null,
  minBasket: null,
  maxDiscount: null,
  ...over,
});

describe("diffPriceFields", () => {
  it("records nothing when the update touches no watched figure", () => {
    expect(diffPriceFields(offer({ percentOff: 20 }), {}, "percentage_discount")).toEqual([]);
  });

  it("records nothing when every figure is saved back unchanged", () => {
    const before = offer({ percentOff: 20, originalValue: "30.00", minBasket: "10.00" });
    expect(diffPriceFields(before, { percentOff: 20, originalValue: 30, minBasket: 10 }, "percentage_discount")).toEqual([]);
  });

  it("treats a numeric column's string form as the same value as the number", () => {
    const before = offer({ typicalSpend: "20.00", itemValue: "5.50", maxDiscount: "12.00" });
    const changes = diffPriceFields(before, { typicalSpend: "20.00", itemValue: 5.5, maxDiscount: "12" }, "percentage_discount");
    expect(changes).toEqual([]);
  });

  it("leaves fields out of the update alone", () => {
    const before = offer({ percentOff: 20, originalValue: "30.00" });
    const changes = diffPriceFields(before, { originalValue: 40 }, "percentage_discount");
    expect(changes.map((c) => c.field)).toEqual(["originalValue"]);
  });

  it("records a rise in the percentage off without flagging it", () => {
    const changes = diffPriceFields(offer({ percentOff: 10 }), { percentOff: 20 }, "percentage_discount");
    expect(changes).toEqual([
      { field: "percentOff", oldValue: 10, newValue: 20, direction: "up", inflatesSaving: false },
    ]);
  });

  it("records a fall in the percentage off, which makes the offer worse and is honest", () => {
    const changes = diffPriceFields(offer({ percentOff: 20 }), { percentOff: 10 }, "percentage_discount");
    expect(changes).toEqual([
      { field: "percentOff", oldValue: 20, newValue: 10, direction: "down", inflatesSaving: false },
    ]);
  });

  it("calls a figure arriving from nothing a set", () => {
    const changes = diffPriceFields(offer({ originalValue: null }), { originalValue: 30 }, "percentage_discount");
    expect(changes[0]).toMatchObject({ field: "originalValue", oldValue: null, newValue: 30, direction: "set" });
  });

  it("calls a figure emptied a cleared", () => {
    const changes = diffPriceFields(offer({ typicalSpend: "30.00" }), { typicalSpend: null }, "percentage_discount");
    expect(changes[0]).toMatchObject({ field: "typicalSpend", oldValue: 30, newValue: null, direction: "cleared" });
  });

  it("flags a rise in the figure an offer is measured against", () => {
    for (const field of ["originalValue", "typicalSpend", "itemValue"] as const) {
      const changes = diffPriceFields(offer({ [field]: "20.00" }), { [field]: 30 }, "percentage_discount");
      expect(changes).toEqual([{ field, oldValue: 20, newValue: 30, direction: "up", inflatesSaving: true }]);
    }
  });

  it("does not flag a fall in those figures", () => {
    const changes = diffPriceFields(offer({ originalValue: "30.00" }), { originalValue: 20 }, "percentage_discount");
    expect(changes[0].inflatesSaving).toBe(false);
  });

  it("does not flag a rise in the minimum basket or the maximum discount", () => {
    const before = offer({ minBasket: "10.00", maxDiscount: "5.00" });
    const changes = diffPriceFields(before, { minBasket: 20, maxDiscount: 8 }, "percentage_discount");
    expect(changes.map((c) => c.inflatesSaving)).toEqual([false, false]);
  });

  it("flags a rising fixed price on a money-off offer, where it is the amount taken off", () => {
    const changes = diffPriceFields(offer({ fixedPrice: "5.00" }), { fixedPrice: 8 }, "fixed_amount_discount");
    expect(changes).toEqual([{ field: "fixedPrice", oldValue: 5, newValue: 8, direction: "up", inflatesSaving: true }]);
  });

  it("does not flag the same rise on a fixed price offer, where the resident pays more", () => {
    const changes = diffPriceFields(offer({ fixedPrice: "5.00" }), { fixedPrice: 8 }, "fixed_price");
    expect(changes).toEqual([{ field: "fixedPrice", oldValue: 5, newValue: 8, direction: "up", inflatesSaving: false }]);
  });

  it("does not flag a falling fixed price on a money-off offer", () => {
    const changes = diffPriceFields(offer({ fixedPrice: "8.00" }), { fixedPrice: 5 }, "fixed_amount_discount");
    expect(changes[0]).toMatchObject({ direction: "down", inflatesSaving: false });
  });

  it("does not flag a figure set from nothing, which has no move to read", () => {
    const changes = diffPriceFields(offer({ itemValue: null }), { itemValue: 12 }, "free_item_with_purchase");
    expect(changes[0]).toMatchObject({ direction: "set", inflatesSaving: false });
  });

  it("records every changed field in one edit, in schema order", () => {
    const before = offer({ percentOff: 10, originalValue: "20.00", typicalSpend: "25.00" });
    const changes = diffPriceFields(before, { percentOff: 25, originalValue: 40, typicalSpend: 25 }, "percentage_discount");
    expect(changes.map((c) => c.field)).toEqual(["percentOff", "originalValue"]);
  });

  it("ignores an unreadable figure rather than recording a change to nothing", () => {
    const changes = diffPriceFields(offer({ minBasket: null }), { minBasket: "" }, "percentage_discount");
    expect(changes).toEqual([]);
  });

  it("treats a difference below a penny as no change, since the column holds two places", () => {
    const changes = diffPriceFields(offer({ originalValue: "20.00" }), { originalValue: 20.001 }, "percentage_discount");
    expect(changes).toEqual([]);
  });
});

describe("percentMove", () => {
  it("gives the move as a fraction of the old figure", () => {
    expect(percentMove("20.00", "25.00")).toBe(0.25);
  });

  it("is negative when the figure fell", () => {
    expect(percentMove(20, 15)).toBe(-0.25);
  });

  it("has no move when there was nothing to move from", () => {
    expect(percentMove(null, 25)).toBeNull();
    expect(percentMove("0.00", 25)).toBeNull();
    expect(percentMove("20.00", null)).toBeNull();
  });
});
