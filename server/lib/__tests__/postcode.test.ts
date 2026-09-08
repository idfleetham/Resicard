import { describe, it, expect } from "vitest";
import { describePostcode, isLocalPostcode, normalisePostcode } from "../postcode";

// The live catchment: three whole districts, and only two sectors of KY15,
// because KY15 is Cupar and reaches a long way into the countryside.
const PREFIXES = ["KY16", "KY9", "KY10", "KY15 4", "KY15 5"];

describe("normalisePostcode", () => {
  it("uppercases and puts a single space before the inward code", () => {
    expect(normalisePostcode("ky169aj")).toBe("KY16 9AJ");
    expect(normalisePostcode("  KY16   9aj ")).toBe("KY16 9AJ");
  });

  it("rejects anything that cannot be a postcode", () => {
    expect(normalisePostcode("KY16")).toBeNull();
    expect(normalisePostcode("hello world")).toBeNull();
    expect(normalisePostcode("KY16 9AJX")).toBeNull();
  });
});

describe("isLocalPostcode", () => {
  it("accepts a whole district that is listed", () => {
    expect(isLocalPostcode("KY16 9AJ", PREFIXES)).toBe(true);
    expect(isLocalPostcode("KY9 1AA", PREFIXES)).toBe(true);
    expect(isLocalPostcode("KY10 3DE", PREFIXES)).toBe(true);
  });

  it("accepts only the listed sectors of a part-included district", () => {
    expect(isLocalPostcode("KY15 4AB", PREFIXES)).toBe(true);
    expect(isLocalPostcode("KY15 5XY", PREFIXES)).toBe(true);
    expect(isLocalPostcode("KY15 7AA", PREFIXES)).toBe(false);
    expect(isLocalPostcode("KY15 1AA", PREFIXES)).toBe(false);
  });

  it("reads KY154 as the sector KY15 4, not as a district", () => {
    expect(isLocalPostcode("KY15 4AB", ["KY154"])).toBe(true);
    expect(isLocalPostcode("KY15 5AB", ["KY154"])).toBe(false);
  });

  it("does not let a shorter district in through a longer one", () => {
    // KY1 is Kirkcaldy and is not in the catchment; KY16 must not admit it.
    expect(isLocalPostcode("KY1 6AA", PREFIXES)).toBe(false);
    // And a listed KY1 must not admit the whole of KY16.
    expect(isLocalPostcode("KY16 9AJ", ["KY1"])).toBe(false);
  });

  it("rejects districts outside the catchment", () => {
    expect(isLocalPostcode("DD6 8AA", PREFIXES)).toBe(false);
    expect(isLocalPostcode("EH1 1AA", PREFIXES)).toBe(false);
  });

  it("rejects anything that is not a postcode", () => {
    expect(isLocalPostcode("", PREFIXES)).toBe(false);
    expect(isLocalPostcode("KY16", PREFIXES)).toBe(false);
  });
});

describe("describePostcode", () => {
  it("passes a postcode inside the catchment and returns it tidied", () => {
    expect(describePostcode("ky16 9aj", PREFIXES)).toEqual({
      valid: true,
      eligible: true,
      normalised: "KY16 9AJ",
    });
  });

  it("separates 'not a postcode' from 'not in the area'", () => {
    // Both false: that is not a postcode at all.
    expect(describePostcode("hello", PREFIXES)).toEqual({ valid: false, eligible: false, normalised: null });
    // Valid but not eligible: a real postcode, outside the area.
    expect(describePostcode("eh1 1aa", PREFIXES)).toEqual({
      valid: true,
      eligible: false,
      normalised: "EH1 1AA",
    });
  });

  it("treats an empty string as not a postcode rather than throwing", () => {
    expect(describePostcode("", PREFIXES).valid).toBe(false);
  });

  it("honours sector-level prefixes", () => {
    expect(describePostcode("KY15 4AB", PREFIXES).eligible).toBe(true);
    expect(describePostcode("KY15 1AA", PREFIXES).eligible).toBe(false);
  });
});
