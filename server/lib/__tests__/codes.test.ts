import { describe, it, expect } from "vitest";
import { CODE_ALPHABET, HANDLE_ALPHABET, HUMAN_ALPHABET, randomCode, randomHandle } from "../codes";

describe("randomCode", () => {
  it("is the length asked for, from the alphabet asked for", () => {
    for (let i = 0; i < 20; i++) {
      const code = randomCode(8);
      expect(code).toHaveLength(8);
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
    }
    const human = randomCode(6, HUMAN_ALPHABET);
    for (const ch of human) expect(HUMAN_ALPHABET).toContain(ch);
  });
});

describe("randomHandle", () => {
  it("is member_ plus eight characters of the handle alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const handle = randomHandle();
      expect(handle).toMatch(/^member_[BCDFGHJKLMNPQRSTVWXYZ2-9]{8}$/);
      expect(handle).toHaveLength("member_".length + 8);
    }
  });

  it("draws only from an alphabet with no vowels and no confusable characters", () => {
    for (const ch of "AEIOU01") expect(HANDLE_ALPHABET).not.toContain(ch);
  });

  it("does not repeat itself in ordinary use, so a collision retry is rare", () => {
    const handles = new Set(Array.from({ length: 200 }, () => randomHandle()));
    expect(handles.size).toBe(200);
  });
});
