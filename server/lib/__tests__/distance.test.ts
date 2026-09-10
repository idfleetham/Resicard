import { describe, it, expect } from "vitest";
import { distanceMetres, formatDistance, sortByDistance } from "@shared/distance";

/*
  Real St Andrews coordinates, so a wrong answer looks wrong. Nothing here names
  a business: these are streets and landmarks.
*/
const MARKET_STREET = { latitude: 56.3398, longitude: -2.7967 };
const WEST_SANDS = { latitude: 56.3465, longitude: -2.8060 };
const CATHEDRAL = { latitude: 56.3387, longitude: -2.7873 };
const DUNDEE = { latitude: 56.4620, longitude: -2.9707 };

describe("distanceMetres", () => {
  it("is zero for the same point", () => {
    expect(distanceMetres(MARKET_STREET, MARKET_STREET)).toBe(0);
  });

  it("measures a walk across town in hundreds of metres", () => {
    const m = distanceMetres(MARKET_STREET, CATHEDRAL);
    expect(m).toBeGreaterThan(500);
    expect(m).toBeLessThan(700);
  });

  it("measures the next town in kilometres", () => {
    // Straight line across the Tay, not the road round by the bridge.
    const m = distanceMetres(MARKET_STREET, DUNDEE);
    expect(m).toBeGreaterThan(16_000);
    expect(m).toBeLessThan(19_000);
  });

  it("is symmetric", () => {
    expect(distanceMetres(MARKET_STREET, WEST_SANDS)).toBeCloseTo(
      distanceMetres(WEST_SANDS, MARKET_STREET),
      6,
    );
  });
});

describe("formatDistance", () => {
  it("rounds to the nearest ten metres rather than claiming a precision a phone fix has not got", () => {
    expect(formatDistance(214)).toBe("210 m");
    expect(formatDistance(216)).toBe("220 m");
  });

  it("never says less than ten metres", () => {
    expect(formatDistance(0)).toBe("10 m");
    expect(formatDistance(3)).toBe("10 m");
  });

  it("switches to kilometres at a thousand metres", () => {
    expect(formatDistance(999)).toBe("1000 m");
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(1640)).toBe("1.6 km");
  });

  it("drops the decimal once the number is large enough not to need it", () => {
    expect(formatDistance(24_300)).toBe("24 km");
  });
});

describe("sortByDistance", () => {
  const outlets = [
    { id: "cathedral", latitude: CATHEDRAL.latitude, longitude: CATHEDRAL.longitude },
    { id: "sands", latitude: WEST_SANDS.latitude, longitude: WEST_SANDS.longitude },
    { id: "nopin", latitude: null, longitude: null },
    { id: "dundee", latitude: DUNDEE.latitude, longitude: DUNDEE.longitude },
  ];

  it("puts the nearest first", () => {
    const ids = sortByDistance(outlets, MARKET_STREET).map((r) => r.outlet.id);
    expect(ids.slice(0, 3)).toEqual(["cathedral", "sands", "dundee"]);
  });

  it("keeps an outlet with no pin on the list, at the end", () => {
    const ids = sortByDistance(outlets, MARKET_STREET).map((r) => r.outlet.id);
    expect(ids).toHaveLength(4);
    expect(ids[3]).toBe("nopin");
  });

  it("reports no distance for an outlet with no pin", () => {
    const row = sortByDistance(outlets, MARKET_STREET).find((r) => r.outlet.id === "nopin");
    expect(row?.metres).toBeNull();
  });

  it("gives every placed outlet a distance", () => {
    for (const row of sortByDistance(outlets, MARKET_STREET)) {
      if (row.outlet.id === "nopin") continue;
      expect(row.metres).toBeGreaterThan(0);
    }
  });

  it("holds the order when a half-set pin has a latitude but no longitude", () => {
    const half = [{ id: "half", latitude: 56.34, longitude: null }];
    expect(sortByDistance(half, MARKET_STREET)[0].metres).toBeNull();
  });
});
