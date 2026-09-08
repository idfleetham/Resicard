import { describe, it, expect } from "vitest";
import { HUMAN_ALPHABET } from "../codes";
import {
  attemptsLeft,
  expiryDate,
  formatAddress,
  hashCode,
  isAddressComplete,
  isExpired,
  newPostcardCode,
  printSheetHtml,
} from "../postcards";

describe("postcard codes", () => {
  it("are six characters from the human alphabet", () => {
    for (let i = 0; i < 20; i++) {
      const code = newPostcardCode();
      expect(code).toHaveLength(6);
      for (const ch of code) expect(HUMAN_ALPHABET).toContain(ch);
    }
  });

  it("hash to the same sha256 hex regardless of case or spacing", () => {
    const code = newPostcardCode();
    const hash = hashCode(code);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCode(code.toLowerCase())).toBe(hash);
    expect(hashCode(` ${code.slice(0, 3)} ${code.slice(3)} `)).toBe(hash);
    expect(hashCode("ABCDEF")).not.toBe(hashCode("ABCDEG"));
  });
});

describe("attemptsLeft", () => {
  it("counts down from the maximum and never goes negative", () => {
    expect(attemptsLeft(0, 5)).toBe(5);
    expect(attemptsLeft(null, 5)).toBe(5);
    expect(attemptsLeft(4, 5)).toBe(1);
    expect(attemptsLeft(5, 5)).toBe(0);
    expect(attemptsLeft(9, 5)).toBe(0);
  });
});

describe("expiry", () => {
  const now = new Date("2026-09-07T12:00:00Z");

  it("is POSTCARD_CODE_DAYS after posting", () => {
    expect(expiryDate(60, now).toISOString()).toBe("2026-11-06T12:00:00.000Z");
  });

  it("treats a past or exact expiry as expired and a future one as live", () => {
    expect(isExpired(new Date("2026-09-06T12:00:00Z"), now)).toBe(true);
    expect(isExpired(now, now)).toBe(true);
    expect(isExpired(expiryDate(60, now), now)).toBe(false);
    expect(isExpired("2026-12-01T00:00:00Z", now)).toBe(false);
  });
});

describe("address", () => {
  it("formats the lines that are present and knows when it is complete", () => {
    expect(formatAddress({ addressLine1: "12 Market Street", addressLine2: null, town: "St Andrews", postcode: "KY16 9NT" })).toBe(
      "12 Market Street\nSt Andrews\nKY16 9NT",
    );
    expect(isAddressComplete({ addressLine1: "12 Market Street", town: "St Andrews", postcode: "KY16 9NT" })).toBe(true);
    expect(isAddressComplete({ addressLine1: "", town: "St Andrews", postcode: "KY16 9NT" })).toBe(false);
  });
});

describe("printSheetHtml", () => {
  const cards = Array.from({ length: 5 }, (_, i) => ({
    name: `Resident ${i + 1}`,
    address: `${i + 1} Market Street\nSt Andrews\nKY16 9N${i}`,
    code: `CODE${String(i).padStart(2, "0")}`,
    expiresAt: new Date("2026-11-06T12:00:00Z"),
  }));

  it("contains each code and address exactly once", () => {
    const html = printSheetHtml(cards);
    for (const c of cards) {
      expect(html.split(c.code).length - 1).toBe(1);
      expect(html.split(`${c.address.split("\n")[0]}<br>`).length - 1).toBe(1);
      expect(html.split(c.name).length - 1).toBe(1);
    }
  });

  it("lays four cards on each A4 sheet and states the expiry date", () => {
    const html = printSheetHtml(cards);
    expect(html.split('class="sheet"').length - 1).toBe(2);
    expect(html.split('class="card"').length - 1).toBe(5);
    expect(html).toContain("@page { size: A4; margin: 0; }");
    expect(html).toContain("It expires on 06 Nov 2026.");
    expect(html).toContain("Your Resicard code");
  });

  it("escapes html in names and addresses", () => {
    const html = printSheetHtml([{ ...cards[0], name: "<b>Bob</b>", address: "1 & 2 High St\nSt Andrews" }]);
    expect(html).not.toContain("<b>Bob</b>");
    expect(html).toContain("&lt;b&gt;Bob&lt;/b&gt;");
    expect(html).toContain("1 &amp; 2 High St<br>");
  });
});
