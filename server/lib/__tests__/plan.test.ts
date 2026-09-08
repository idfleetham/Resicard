import { describe, it, expect } from "vitest";
import {
  ANALYTICS_PLAN_REQUIRED_MESSAGE,
  PLAN_REQUIRED_MESSAGE,
  canGoLive,
  hasAnalytics,
  hasLoyalty,
  liveOffersOverLimit,
  normalisePlan,
  planFeatures,
  planFeeGbp,
  planLimitMessage,
  planRank,
} from "../plan";

const FEES = { standard: 30, insight: 75 };

describe("normalisePlan", () => {
  it("reads the three current plans", () => {
    expect(normalisePlan("free")).toBe("free");
    expect(normalisePlan("standard")).toBe("standard");
    expect(normalisePlan("insight")).toBe("insight");
  });

  it("reads the legacy premium rows as Standard", () => {
    expect(normalisePlan("premium")).toBe("standard");
    expect(planRank("premium")).toBe(1);
  });

  it("treats anything unknown or missing as Free", () => {
    expect(normalisePlan(null)).toBe("free");
    expect(normalisePlan(undefined)).toBe("free");
    expect(normalisePlan("trial")).toBe("free");
    expect(normalisePlan("Insight")).toBe("free");
  });
});

describe("plan ranks and gates", () => {
  it("ranks the plans", () => {
    expect(planRank("free")).toBe(0);
    expect(planRank("standard")).toBe(1);
    expect(planRank("insight")).toBe(2);
  });

  it("opens loyalty at Standard and analytics at Insight", () => {
    expect(hasLoyalty("free")).toBe(false);
    expect(hasLoyalty("standard")).toBe(true);
    expect(hasLoyalty("premium")).toBe(true);
    expect(hasLoyalty("insight")).toBe(true);

    expect(hasAnalytics("free")).toBe(false);
    expect(hasAnalytics("standard")).toBe(false);
    expect(hasAnalytics("premium")).toBe(false);
    expect(hasAnalytics("insight")).toBe(true);
  });

  it("describes the features of each plan", () => {
    expect(planFeatures("free")).toEqual({ unlimitedOffers: false, loyalty: false, analytics: false });
    expect(planFeatures("standard")).toEqual({ unlimitedOffers: true, loyalty: true, analytics: false });
    expect(planFeatures("premium")).toEqual({ unlimitedOffers: true, loyalty: true, analytics: false });
    expect(planFeatures("insight")).toEqual({ unlimitedOffers: true, loyalty: true, analytics: true });
  });
});

describe("merchant plan limits", () => {
  it("lets Free merchants go live up to the limit", () => {
    expect(canGoLive("free", 0, 2)).toBe(true);
    expect(canGoLive("free", 1, 2)).toBe(true);
    expect(canGoLive("free", 2, 2)).toBe(false);
    expect(canGoLive("free", 5, 2)).toBe(false);
  });

  it("treats a missing or unknown plan as Free", () => {
    expect(canGoLive(null, 2, 2)).toBe(false);
    expect(canGoLive(undefined, 1, 2)).toBe(true);
    expect(canGoLive("trial", 2, 2)).toBe(false);
  });

  it("never limits a paid plan", () => {
    for (const plan of ["standard", "premium", "insight"]) {
      expect(canGoLive(plan, 200, 2)).toBe(true);
      expect(liveOffersOverLimit(plan, 200, 2)).toBe(0);
    }
  });

  it("counts the extras over the Free limit", () => {
    expect(liveOffersOverLimit("free", 1, 2)).toBe(0);
    expect(liveOffersOverLimit("free", 2, 2)).toBe(0);
    expect(liveOffersOverLimit("free", 5, 2)).toBe(3);
  });
});

describe("fees and messages", () => {
  it("prices each plan, including the legacy value", () => {
    expect(planFeeGbp("free", FEES)).toBe(0);
    expect(planFeeGbp(null, FEES)).toBe(0);
    expect(planFeeGbp("standard", FEES)).toBe(30);
    expect(planFeeGbp("premium", FEES)).toBe(30);
    expect(planFeeGbp("insight", FEES)).toBe(75);
  });

  it("writes the limit and gate messages", () => {
    expect(planLimitMessage(2)).toBe("Free plan allows 2 live offers. Standard and Insight have no limit.");
    expect(planLimitMessage(1)).toBe("Free plan allows 1 live offer. Standard and Insight have no limit.");
    expect(PLAN_REQUIRED_MESSAGE).toBe("The loyalty programme is part of Standard and Insight.");
    expect(ANALYTICS_PLAN_REQUIRED_MESSAGE).toBe("Analytics are part of Insight.");
  });
});
