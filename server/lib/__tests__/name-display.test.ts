import { describe, it, expect } from "vitest";
import { cardNameSize, cardNameSizeFor, longestWord } from "@shared/name-display";

describe("cardNameSize", () => {
  it("gives a short name the full size", () => {
    expect(cardNameSize("Iona Whyte")).toBe("large");
    expect(cardNameSize("Ann Bell")).toBe("large");
  });

  it("steps down once the name passes what the row fits", () => {
    expect(cardNameSize("Catherine Morrison")).toBe("medium");
    expect(cardNameSize("Alexandra Fotheringham")).toBe("medium"); // 22, the last that fits
    expect(cardNameSize("Alexandra Fotheringham-Bell")).toBe("small");
  });

  it("ignores surrounding space", () => {
    expect(cardNameSize("  Iona Whyte  ")).toBe("large");
  });
});

describe("longestWord", () => {
  it("finds the longest run without a space, which is what cannot be broken", () => {
    expect(longestWord("Iona Whyte")).toBe(5);
    expect(longestWord("Alexandra Fotheringham")).toBe(12);
    expect(longestWord("Ann Featherstonehaugh")).toBe(17);
  });
});

describe("cardNameSizeFor", () => {
  it("takes whichever rule is stricter", () => {
    // 21 characters, so length alone says medium, but the surname cannot break.
    expect(cardNameSizeFor("Ann Featherstonehaugh")).toBe("small");
    // 22 characters and both words break cleanly, so it stays at the middle size.
    expect(cardNameSizeFor("Alexandra Fotheringham")).toBe("medium");
    expect(cardNameSizeFor("Iona Whyte")).toBe("large");
  });

  it("never returns a size that would clip a single unbreakable word", () => {
    expect(cardNameSizeFor("Bartholomew")).toBe("large");
    expect(cardNameSizeFor("Constantinople")).toBe("medium");
    expect(cardNameSizeFor("Llanfairpwllgwyngyll")).toBe("small");
  });
});
