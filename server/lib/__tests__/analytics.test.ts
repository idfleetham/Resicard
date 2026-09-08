import { describe, expect, it } from "vitest";
import {
  buildBusiestDays,
  buildByDay,
  buildByHour,
  buildByOffer,
  buildByWeek,
  buildHeadline,
  buildMemberGrowth,
  dayKey,
  firstSeenByUser,
  hourOf,
  inWindow,
  median,
  offerHeadline,
  weekStart,
  weekStartsEndingAt,
  type RedemptionLike,
} from "../analytics";

const at = (iso: string) => new Date(iso);

function redemption(iso: string, userId: number, offerId = "offer-a", basketAmount: string | null = null): RedemptionLike {
  return { redeemedAt: at(iso), userId, offerId, basketAmount };
}

describe("London bucketing", () => {
  it("puts a summer instant on its London day, not its UTC day", () => {
    // 23:30 UTC on Thursday 2 July 2026 is 00:30 Friday in London (BST).
    expect(dayKey(at("2026-07-02T23:30:00Z"))).toBe("fri");
    expect(hourOf(at("2026-07-02T23:30:00Z"))).toBe(0);
  });

  it("keeps a winter instant on the UTC day", () => {
    expect(dayKey(at("2026-01-08T23:30:00Z"))).toBe("thu");
    expect(hourOf(at("2026-01-08T23:30:00Z"))).toBe(23);
  });

  it("starts weeks on Monday", () => {
    expect(weekStart(at("2026-09-08T12:00:00Z"))).toBe("2026-09-07"); // a Tuesday
    expect(weekStart(at("2026-09-07T00:00:00Z"))).toBe("2026-09-07"); // the Monday itself
    expect(weekStart(at("2026-09-06T22:00:00Z"))).toBe("2026-08-31"); // Sunday, previous week
  });

  it("rolls a Sunday 23:30 BST instant into the week that has already started", () => {
    // 23:30 UTC Sunday is 00:30 Monday in London, so it belongs to the new week.
    expect(weekStart(at("2026-09-06T23:30:00Z"))).toBe("2026-09-07");
  });

  it("lists 13 consecutive Mondays ending with the current week", () => {
    const weeks = weekStartsEndingAt(at("2026-09-08T12:00:00Z"), 13);
    expect(weeks).toHaveLength(13);
    expect(weeks[12]).toBe("2026-09-07");
    expect(weeks[0]).toBe("2026-06-15");
    expect(new Set(weeks).size).toBe(13);
  });

  it("spans a DST change without losing or repeating a week", () => {
    const weeks = weekStartsEndingAt(at("2026-11-03T12:00:00Z"), 8);
    expect(weeks).toEqual([
      "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05",
      "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02",
    ]);
  });
});

describe("median", () => {
  it("takes the middle of an odd list", () => {
    expect(median([9, 1, 5])).toBe(5);
  });
  it("averages the two middles of an even list", () => {
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
  it("is 0 for nothing", () => {
    expect(median([])).toBe(0);
  });
});

describe("buildByWeek", () => {
  const to = at("2026-09-08T12:00:00Z");
  const rows = [
    redemption("2026-09-07T18:00:00Z", 1),
    redemption("2026-09-08T18:00:00Z", 1),
    redemption("2026-09-08T19:00:00Z", 2),
    redemption("2026-08-25T19:00:00Z", 3),
  ];

  it("returns 13 weeks, oldest first, every week present", () => {
    const weeks = buildByWeek(rows, firstSeenByUser(rows), to);
    expect(weeks).toHaveLength(13);
    expect(weeks.map((w) => w.weekStart)).toEqual(weekStartsEndingAt(to, 13));
    expect(weeks[12]).toEqual({ weekStart: "2026-09-07", redemptions: 3, newResidents: 2 });
  });

  it("counts a resident as new only in the week of their first visit", () => {
    const weeks = buildByWeek(rows, firstSeenByUser(rows), to);
    const august = weeks.find((w) => w.weekStart === "2026-08-24");
    expect(august).toEqual({ weekStart: "2026-08-24", redemptions: 1, newResidents: 1 });
    // User 1 first came on 7 Sept, so their 8 Sept visit is not a second "new".
    expect(weeks[12].newResidents).toBe(2);
  });

  it("ignores redemptions older than the 13 weeks", () => {
    const stale = [...rows, redemption("2025-01-01T12:00:00Z", 9)];
    const weeks = buildByWeek(stale, firstSeenByUser(stale), to);
    expect(weeks.reduce((s, w) => s + w.redemptions, 0)).toBe(4);
  });
});

describe("buildByDay and buildByHour", () => {
  it("returns every day Monday first and every hour 0..23", () => {
    const rows = [
      redemption("2026-09-03T18:00:00Z", 1), // Thursday 19:00 BST
      redemption("2026-09-03T19:30:00Z", 2), // Thursday 20:30 BST
      redemption("2026-09-06T12:00:00Z", 3), // Sunday 13:00 BST
    ];
    const days = buildByDay(rows);
    expect(days.map((d) => d.day)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    expect(days.find((d) => d.day === "thu")?.redemptions).toBe(2);
    expect(days.find((d) => d.day === "sun")?.redemptions).toBe(1);
    expect(days.find((d) => d.day === "mon")?.redemptions).toBe(0);

    const hours = buildByHour(rows);
    expect(hours).toHaveLength(24);
    expect(hours[19].redemptions).toBe(1);
    expect(hours[20].redemptions).toBe(1);
    expect(hours[13].redemptions).toBe(1);
    expect(hours.reduce((s, h) => s + h.redemptions, 0)).toBe(3);
  });
});

describe("buildByOffer", () => {
  const offers = [
    { id: "a", title: "20% off food", type: "percentage_discount", percentOff: 20, fixedPrice: null, shortPromo: null },
    { id: "b", title: "Sunday roast", type: "fixed_price", percentOff: null, fixedPrice: "15.00", shortPromo: null },
  ];

  it("ranks by redemptions and shares sum to 1", () => {
    const rows = [
      redemption("2026-09-01T18:00:00Z", 1, "a"),
      redemption("2026-09-01T19:00:00Z", 2, "a"),
      redemption("2026-09-02T19:00:00Z", 3, "a"),
      redemption("2026-09-06T13:00:00Z", 4, "b"),
    ];
    const byOffer = buildByOffer(rows, offers);
    expect(byOffer.map((o) => o.offerId)).toEqual(["a", "b"]);
    expect(byOffer[0]).toMatchObject({ title: "20% off food", headline: "20% off", redemptions: 3, share: 0.75 });
    expect(byOffer[1]).toMatchObject({ headline: "£15", redemptions: 1, share: 0.25 });
    expect(byOffer.reduce((s, o) => s + o.share, 0)).toBeCloseTo(1, 5);
  });

  it("survives a redemption whose offer has been deleted", () => {
    const byOffer = buildByOffer([redemption("2026-09-01T18:00:00Z", 1, "gone")], offers);
    expect(byOffer[0]).toMatchObject({ title: "Removed offer", redemptions: 1, share: 1 });
  });

  it("headlines each offer type", () => {
    expect(offerHeadline({ id: "x", title: "t", type: "bogo", percentOff: null, fixedPrice: null, shortPromo: null })).toBe("2 for 1");
    expect(offerHeadline({ id: "x", title: "t", type: "free_item_with_purchase", percentOff: null, fixedPrice: null, shortPromo: null })).toBe("Free item");
    expect(offerHeadline({ id: "x", title: "t", type: null, percentOff: null, fixedPrice: null, shortPromo: "Locals night" })).toBe("Locals night");
  });
});

describe("buildHeadline", () => {
  const from = at("2026-06-10T00:00:00Z");
  const rows = [
    redemption("2026-07-01T18:00:00Z", 1, "a", "24.50"),
    redemption("2026-08-01T18:00:00Z", 1, "a", "35.50"),
    redemption("2026-08-02T18:00:00Z", 2, "a", null),
  ];
  const previous = [redemption("2026-04-01T18:00:00Z", 1, "a")];

  it("counts residents, new residents, returning share and the average basket", () => {
    // User 1's first ever visit was before the window, so both of their visits are returning.
    const firstSeen = new Map([[1, at("2026-04-01T18:00:00Z")], [2, at("2026-08-02T18:00:00Z")]]);
    const headline = buildHeadline(rows, previous, firstSeen, 12, from);
    expect(headline).toEqual({
      redemptions: 3,
      redemptionsPrevious: 1,
      residents: 2,
      newResidents: 1,
      returningShare: 0.667,
      favourites: 12,
      averageBasket: 30,
    });
  });

  it("returns a null average basket when staff never entered a bill", () => {
    const noBaskets = [redemption("2026-07-01T18:00:00Z", 1)];
    const headline = buildHeadline(noBaskets, [], firstSeenByUser(noBaskets), 0, from);
    expect(headline.averageBasket).toBeNull();
  });

  it("is all zeroes with no redemptions", () => {
    const headline = buildHeadline([], [], new Map(), 0, from);
    expect(headline).toMatchObject({ redemptions: 0, residents: 0, newResidents: 0, returningShare: 0, averageBasket: null });
  });
});

describe("inWindow", () => {
  it("includes the start and excludes the end", () => {
    const rows = [redemption("2026-06-10T00:00:00Z", 1), redemption("2026-09-08T00:00:00Z", 2)];
    const kept = inWindow(rows, at("2026-06-10T00:00:00Z"), at("2026-09-08T00:00:00Z"));
    expect(kept).toHaveLength(1);
    expect(kept[0].userId).toBe(1);
  });
});

describe("town shaping", () => {
  it("shares busiest days, busiest first, summing to 1", () => {
    const days = buildBusiestDays([
      { day: "mon", redemptions: 10 },
      { day: "thu", redemptions: 60 },
      { day: "sun", redemptions: 30 },
    ]);
    expect(days[0]).toEqual({ day: "thu", share: 0.6 });
    expect(days.reduce((s, d) => s + d.share, 0)).toBeCloseTo(1, 5);
  });

  it("fills 12 months of member growth, oldest first", () => {
    const growth = buildMemberGrowth([{ month: "2026-09", members: 210 }, { month: "2026-08", members: 190 }], at("2026-09-08T12:00:00Z"));
    expect(growth).toHaveLength(12);
    expect(growth[0].month).toBe("2025-10");
    expect(growth[11]).toEqual({ month: "2026-09", members: 210 });
    expect(growth[10]).toEqual({ month: "2026-08", members: 190 });
    expect(growth[0].members).toBe(0);
  });

  it("ignores months outside the 12", () => {
    const growth = buildMemberGrowth([{ month: "2024-01", members: 5 }], at("2026-09-08T12:00:00Z"));
    expect(growth.every((g) => g.members === 0)).toBe(true);
  });
});
