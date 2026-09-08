/**
 * How big a resident's name can be drawn on the membership card.
 *
 * The card's name row is about 200px wide on a phone once the photo is taken out
 * of it, which fits roughly fourteen characters of the display face at its full
 * size. Rather than measure text in the browser, which means a reflow and a
 * flicker on every render, the size steps down by length. The thresholds are
 * deliberately cautious: a name that could have been a size larger looks fine,
 * and one that is a size too big clips, which is the bug this exists to fix.
 *
 * Two lines are always allowed. The step-down is what stops a long name needing
 * three.
 */
export type CardNameSize = "large" | "medium" | "small";

export function cardNameSize(name: string): CardNameSize {
  const length = name.trim().length;
  if (length <= 14) return "large";
  if (length <= 22) return "medium";
  return "small";
}

/**
 * The longest word in the name, which is what actually decides whether a line
 * can break. "Alexandra Fotheringham" is 22 characters but breaks cleanly;
 * "Featherstonehaugh" is 17 and cannot break at all, so it needs the smaller
 * size despite being the shorter string.
 */
export function longestWord(name: string): number {
  return name.trim().split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);
}

/** The size to actually use: the stricter of overall length and the longest unbreakable word. */
export function cardNameSizeFor(name: string): CardNameSize {
  const byLength = cardNameSize(name);
  const byWord: CardNameSize = longestWord(name) <= 11 ? "large" : longestWord(name) <= 15 ? "medium" : "small";
  const order: CardNameSize[] = ["large", "medium", "small"];
  return order[Math.max(order.indexOf(byLength), order.indexOf(byWord))];
}
