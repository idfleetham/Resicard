import { describe, it, expect } from "vitest";
import { canGoLive, isPremium, liveOffersOverLimit, planFeatures, planLimitMessage } from "../plan";

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

  it("never limits Premium", () => {
    expect(canGoLive("premium", 0, 2)).toBe(true);
    expect(canGoLive("premium", 200, 2)).toBe(true);
    expect(liveOffersOverLimit("premium", 200, 2)).toBe(0);
  });

  it("counts the extras over the Free limit", () => {
    expect(liveOffersOverLimit("free", 1, 2)).toBe(0);
    expect(liveOffersOverLimit("free", 2, 2)).toBe(0);
    expect(liveOffersOverLimit("free", 5, 2)).toBe(3);
  });

  it("describes features and the limit message", () => {
    expect(isPremium("premium")).toBe(true);
    expect(isPremium("free")).toBe(false);
    expect(planFeatures("free")).toEqual({ unlimitedOffers: false, loyalty: false, analytics: false });
    expect(planFeatures("premium")).toEqual({ unlimitedOffers: true, loyalty: true, analytics: true });
    expect(planLimitMessage(2)).toBe("Free plan allows 2 live offers. Upgrade to Premium for more.");
    expect(planLimitMessage(1)).toBe("Free plan allows 1 live offer. Upgrade to Premium for more.");
  });
});
