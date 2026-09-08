/**
 * Redraws the generated artwork on offers that already exist.
 *
 * The picture on an offer is written onto the row when the offer is created, so
 * a change to how the artwork is drawn does not reach offers that are already in
 * the database. Re-running the demo seed would fix that, but it deletes every
 * account and every redemption to do it, which is a heavy price for new pictures.
 * This changes one column and nothing else.
 *
 *   npm run art:repaint              say what would change, change nothing
 *   npm run art:repaint -- --yes     apply it
 *
 * **It only ever replaces artwork this codebase drew.** The test is the value in
 * the column: a generated picture is an SVG data URL, and an offer whose image is
 * anything else - a photograph a real merchant uploaded, a hosted file, an empty
 * column - is left alone. That is what makes this safe to run against a database
 * with real outlets on it, and it is the reason the check is on the stored value
 * rather than on a list of demo merchant ids.
 */

import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { merchants, offers } from "@shared/schema";
import { offerArt } from "./demo-art";
import { OUTLETS } from "./demo-data";

/** Generated artwork, and nothing else, looks like this. */
const GENERATED = /^data:image\/svg\+xml;base64,/;

/**
 * The colourway is picked from the outlet's slug, which is not a column: it lives
 * in the demo town definition. Matching on name keeps every seeded outlet on the
 * colourway it already had, so this reads as the same outlets redrawn rather than
 * a reshuffle. Anything not in the demo town falls back to a slug of its name,
 * which is stable for that outlet even though it was never seeded from here.
 */
const SLUG_BY_NAME = new Map(OUTLETS.map((o) => [o.name.toLowerCase(), o.slug]));

function slugFor(name: string): string {
  return (
    SLUG_BY_NAME.get(name.toLowerCase()) ??
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  );
}

async function main() {
  const apply = process.argv.includes("--yes");
  if (!db) throw new Error("No database connection");

  const rows = await db
    .select({
      id: offers.id,
      title: offers.title,
      shortPromo: offers.shortPromo,
      tags: offers.tags,
      category: offers.category,
      imageUrl: offers.imageUrl,
      merchantId: offers.merchantId,
      merchantName: merchants.name,
      merchantCategory: merchants.category,
    })
    .from(offers)
    .innerJoin(merchants, eq(offers.merchantId, merchants.id))
    .orderBy(asc(offers.merchantId), asc(offers.createdAt));

  let repainted = 0;
  let skipped = 0;
  let unchanged = 0;
  // The index is the offer's position within its own outlet, because that is what
  // the artwork uses to vary the backdrop and to step the category rota. Ordering
  // by creation date reproduces the order the seed created them in.
  const seen = new Map<string, number>();

  for (const row of rows) {
    const index = seen.get(row.merchantId) ?? 0;
    seen.set(row.merchantId, index + 1);

    if (!row.imageUrl || !GENERATED.test(row.imageUrl)) {
      skipped += 1;
      continue;
    }

    const category = row.category ?? row.merchantCategory ?? "";
    const extra = `${row.shortPromo ?? ""} ${(row.tags ?? []).join(" ")}`;
    const next = offerArt(slugFor(row.merchantName), row.title, index, category, extra);
    if (next === row.imageUrl) {
      unchanged += 1;
      continue;
    }

    if (apply) await db.update(offers).set({ imageUrl: next }).where(eq(offers.id, row.id));
    repainted += 1;
    console.log(`${apply ? "Repainted" : "Would repaint"}  ${row.merchantName} - ${row.title}`);
  }

  console.log("");
  console.log(`${rows.length} offers seen.`);
  console.log(`${repainted} ${apply ? "repainted" : "would be repainted"}.`);
  if (unchanged > 0) console.log(`${unchanged} already had the current artwork.`);
  if (skipped > 0) console.log(`${skipped} left alone: no image, or an image this codebase did not draw.`);
  if (!apply && repainted > 0) console.log("\nNothing was written. Run again with --yes to apply.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
