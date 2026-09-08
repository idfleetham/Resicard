/**
 * Seeds a populated demo town: 24 invented outlets at real St Andrews addresses,
 * 60 invented residents, offers, loyalty programmes and six months of redemption
 * history. For showing the app to a prospective merchant and for developing
 * against data that has some shape to it.
 *
 * Usage: npm run seed:demo -- --yes [--force]
 *
 * Nothing here names a real business. Real trader names with invented offers
 * attached would misrepresent people who never agreed to any of it, so every
 * outlet name is made up and only the streets are real. Every login is on the
 * reserved `.test` top-level domain (RFC 2606), which can never resolve, so no
 * transactional email this data triggers can reach a real mailbox.
 *
 * It refuses outright in production, and refuses to run over a database holding
 * any non-`.test` account unless --force is given: it deletes every non-admin
 * user and all merchant, offer, redemption and ledger rows before seeding.
 */
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import { db, pool } from "../db";
import { config } from "../config";
import {
  favourites, loyaltyBalances, loyaltyEvents, loyaltyPrograms, loyaltyRewards,
  loyaltyTiers, merchants, offerPriceChanges, offers, passwordResetTokens, postcards, redemptions,
  rewardClaims, subscriptionEvents, users, type Offer,
} from "@shared/schema";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import * as loyaltyStore from "../storage/loyalty";
import { randomHandle } from "../lib/codes";
import { uniqueScanCode } from "../lib/scan-code";
import { generateRedemptionCode, isOfferLiveNow, pointsForRedemption } from "../lib/offer-rules";
import { resolveStatus } from "../lib/loyalty";
import { estimateSaving } from "../lib/savings";
import { planFeeGbp as residentFeeGbp, randomHouseholdCode } from "../lib/membership";
import { planFeeGbp as merchantFeeGbp } from "../lib/plan";
import {
  BUSINESS_HOURS, DAY_WEIGHTS, HOURS_BY_CATEGORY, OUTLETS, RESIDENT_NAMES, RESIDENT_POSTCODES, RESIDENT_STREETS,
  STREET_NAMES, STREETS, TIER_COLOURS, TIER_THRESHOLDS, VISITS_BY_BAND, pointOn,
} from "./demo-data";

const PASSWORD = "demo1234";
const HISTORY_DAYS = 182;
const DAY_MS = 86_400_000;

// A fixed seed, so two runs of the demo produce the same town and a screenshot
// taken today still matches the app tomorrow.
let seed = 20260908;
function rand(): number {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const chance = (p: number) => rand() < p;

/** Picks an index from a weight table. */
function weighted(weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// Europe/London wall-clock ------------------------------------------------------

const LONDON = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function londonOffsetMinutes(at: Date): number {
  const p: Record<string, string> = {};
  for (const part of LONDON.formatToParts(at)) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** The instant at which it is `hour:minute` in St Andrews on the day `dayUtc` falls on. */
function londonInstant(dayUtc: Date, hour: number, minute: number): Date {
  const naive = Date.UTC(dayUtc.getUTCFullYear(), dayUtc.getUTCMonth(), dayUtc.getUTCDate(), hour, minute);
  const guess = new Date(naive - londonOffsetMinutes(new Date(naive)) * 60000);
  return new Date(naive - londonOffsetMinutes(guess) * 60000);
}

/** Redemptions run from 08:00, which is where the hour weight tables start. */
const FIRST_HOUR = 8;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const money = (n: number | null) => (n === null ? null : n.toFixed(2));
const addMonths = (d: Date, n: number) => {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + n);
  return out;
};

type Insertable = Parameters<typeof db.insert>[0];

/** Inserts in chunks, because a six-month history is a few thousand rows. */
async function insertMany(table: Insertable, rows: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(table).values(rows.slice(i, i + 500) as never);
  }
}

// Safety ------------------------------------------------------------------------

/** The guard against seeding over real members: every account must be on .test. */
async function assertDemoDatabase(force: boolean): Promise<void> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(sql`lower(${users.email}) not like '%.test'`);
  if ((row?.n ?? 0) > 0 && !force) {
    throw new Error(`${row.n} account(s) here are not on .test, so this may be a real database. ` +
      "Re-run with --force only if you are certain it is not.");
  }
}

/** Clears everything the seed owns, so it can be run repeatedly. Admins are kept. */
async function wipe(): Promise<void> {
  for (const table of [
    rewardClaims, loyaltyEvents, loyaltyBalances, loyaltyRewards, loyaltyTiers, loyaltyPrograms,
    redemptions, offerPriceChanges, offers, favourites, merchants, subscriptionEvents, postcards,
    passwordResetTokens,
  ]) {
    await db.delete(table);
  }
  await db.delete(users).where(sql`${users.role} <> 'admin'`);
}

// Seeding -----------------------------------------------------------------------

interface SeededOutlet {
  id: string; slug: string; category: string; plan: string; planStartedAt: Date; name: string;
  offers: Offer[];
  programId: number | null;
  tiers: { id: string; thresholdPoints: number; sortOrder: number | null; pointsMultiplier: string | null }[];
  program: { pointsPerCurrency: number | null; pointsPerRedemption: number | null; minBasketEarn: string | null } | null;
  rewards: { id: string; costPoints: number | null }[];
}

async function seedOutlets(hash: string, now: Date): Promise<SeededOutlet[]> {
  const validFrom = iso(new Date(now.getTime() - (HISTORY_DAYS + 21) * DAY_MS));
  const validTo = iso(addMonths(now, 12));
  const seeded: SeededOutlet[] = [];

  for (const outlet of OUTLETS) {
    const owner = await userStore.createUser({
      username: `owner_${outlet.slug.replace(/-/g, "_")}`, email: `owner@${outlet.slug}.test`, password: hash,
      firstName: outlet.name.replace(/^The /, "").split(/[ &]/)[0], surname: "Demo", role: "merchant",
    });
    const point = pointOn(outlet.street, outlet.t, outlet.side);
    const planStartedAt = new Date(now.getTime() - randInt(120, HISTORY_DAYS + 40) * DAY_MS);
    const merchant = await merchantStore.createMerchant({
      ownerUserId: owner.id, name: outlet.name, category: outlet.category, email: `hello@${outlet.slug}.test`,
      phone: outlet.phone, businessHours: BUSINESS_HOURS, latitude: point.lat, longitude: point.lng,
      address: `${outlet.houseNumber} ${STREET_NAMES[outlet.street]}, St Andrews, ${STREETS[outlet.street].postcode}`,
      scanCode: await uniqueScanCode(), status: "approved", approvedAt: planStartedAt,
      planStatus: outlet.plan, planStartedAt, planRenewsAt: outlet.plan === "free" ? null : addMonths(now, 1),
    });
    await userStore.updateUser(owner.id, { merchantId: merchant.id });

    const created: Offer[] = [];
    for (const o of outlet.offers) {
      created.push(
        await offerStore.createOffer({
          merchantId: merchant.id, title: o.title, shortPromo: o.shortPromo, type: o.type, category: outlet.category,
          description: `${o.shortPromo}. Show your Resicard at ${outlet.name}.`,
          percentOff: o.percentOff ?? null, fixedPrice: money(o.fixedPrice ?? null), originalValue: money(o.originalValue ?? null),
          typicalSpend: money(o.typicalSpend ?? null), itemValue: money(o.itemValue ?? null),
          daysOfWeek: o.daysOfWeek ?? [], timeSlots: o.timeSlots ?? {}, validFrom, validTo,
          terms: o.terms ?? "One offer per visit. Not with any other discount.",
          priority: chance(0.25) ? "featured" : "standard", active: true,
        }),
      );
    }

    // Loyalty is a Standard and Insight feature, so only those outlets get a programme.
    let programId: number | null = null;
    let program: SeededOutlet["program"] = null;
    const tiers: SeededOutlet["tiers"] = [];
    const rewards: SeededOutlet["rewards"] = [];
    if (outlet.plan !== "free" && outlet.tiers) {
      const p = await loyaltyStore.createProgram({
        merchantId: merchant.id, model: "points", pointsPerCurrency: 10, pointsPerRedemption: randInt(8, 15),
        cardTheme: outlet.theme, cardPattern: outlet.pattern, tierWindowDays: 365, active: true,
      });
      programId = p.id;
      program = { pointsPerCurrency: p.pointsPerCurrency, pointsPerRedemption: p.pointsPerRedemption, minBasketEarn: p.minBasketEarn };
      for (let i = 0; i < 3; i++) {
        tiers.push(await loyaltyStore.createTier({
          programId: p.id, name: outlet.tiers[i], thresholdPoints: TIER_THRESHOLDS[i], sortOrder: i,
          discountPercent: i === 2 ? outlet.topTierDiscount ?? null : null,
          pointsMultiplier: ["1.00", "1.25", "1.50"][i], color: TIER_COLOURS[i],
        }));
      }
      const names = outlet.rewards ?? ["House reward", "Members' treat"];
      for (let i = 0; i < 2; i++) {
        rewards.push(await loyaltyStore.createReward({
          programId: p.id, name: names[i], costPoints: i === 0 ? 250 : 600,
          claimRule: i === 0 ? "monthly" : "unlimited", terms: "Ask staff to apply it before you pay.", active: true,
        }));
      }
    }

    seeded.push({
      id: merchant.id, slug: outlet.slug, category: outlet.category, plan: outlet.plan, planStartedAt,
      name: outlet.name, offers: created, programId, program, tiers, rewards,
    });
  }
  return seeded;
}

interface SeededResident {
  id: number; name: string; plan: "individual" | "household"; status: "active" | "cancelled" | "inactive";
  expiry: Date | null;
  /** How often they use the card: 0 heavy, 1 middling, 2 occasional. */
  band: number;
  regulars: SeededOutlet[];
}


async function seedResidents(hash: string, now: Date, outlets: SeededOutlet[]): Promise<SeededResident[]> {
  const seeded: SeededResident[] = [];
  for (let i = 0; i < RESIDENT_NAMES.length; i++) {
    const [firstName, surname] = RESIDENT_NAMES[i];
    // Most members are current; a handful lapsed or never paid, so the revenue
    // screens show cancellations and the free tier rather than one flat block.
    const status: SeededResident["status"] = i % 10 === 7 ? "cancelled" : i % 10 === 4 ? "inactive" : "active";
    const plan: SeededResident["plan"] = i % 7 === 3 ? "household" : "individual";
    const expiry =
      status === "active" ? addMonths(now, randInt(1, 12))
      : status === "cancelled" ? new Date(now.getTime() - randInt(10, 90) * DAY_MS)
      : null;
    const joined = new Date(now.getTime() - randInt(30, HISTORY_DAYS + 60) * DAY_MS);

    const user = await userStore.createUser({
      username: randomHandle(), email: `resident${String(i + 1).padStart(2, "0")}@resicard.test`, password: hash,
      firstName, surname, role: "resident", town: "St Andrews", createdAt: joined,
      postcode: RESIDENT_POSTCODES[i % RESIDENT_POSTCODES.length],
      addressLine1: `${randInt(1, 84)} ${RESIDENT_STREETS[i % RESIDENT_STREETS.length]}`,
      isResidencyVerified: true, verifiedAt: joined, verificationMethod: i % 3 === 0 ? "in_person" : "postcard",
      membershipPlan: plan, membershipStatus: status, membershipExpiry: expiry,
      membershipRenews: status === "active" && i % 13 !== 6,
      householdCode: plan === "household" ? randomHouseholdCode() : null,
    });

    const band = i < 6 ? 0 : i < 30 ? 1 : 2;
    // Regulars are dealt round-robin rather than drawn at random: random draws
    // leave some outlets with almost no trade, which reads as a broken demo.
    const regulars = Array.from({ length: randInt(4, 6) }, (_, k) => outlets[(i * 5 + k) % outlets.length]);
    seeded.push({ id: user.id, name: `${firstName} ${surname}`, plan, status, expiry, band, regulars });
  }
  return seeded;
}

// Redemption history ------------------------------------------------------------


/** A redemption code not already used in this run; the column is unique. */
function uniqueCode(seen: Set<string>): string {
  for (;;) {
    const code = generateRedemptionCode();
    if (!seen.has(code)) {
      seen.add(code);
      return code;
    }
  }
}

interface Visit { at: Date; resident: SeededResident; outlet: SeededOutlet; offer: Offer; basket: number | null }

/** One plausible visit, or null when nothing at that outlet was running at that hour. */
function buildVisit(resident: SeededResident, outlets: SeededOutlet[], now: Date): Visit | null {
  const outlet = chance(0.7) ? pick(resident.regulars) : pick(outlets);
  const daysAgo = randInt(0, HISTORY_DAYS - 1);
  const day = new Date(now.getTime() - daysAgo * DAY_MS);
  // Reject days that fall on the quiet part of the week, which shapes the
  // week without ever putting a redemption on a day the offer excludes.
  if (rand() > DAY_WEIGHTS[(day.getUTCDay() + 6) % 7] / 1.6) return null;
  const hours = HOURS_BY_CATEGORY[outlet.category] ?? HOURS_BY_CATEGORY.retail;
  const at = londonInstant(day, FIRST_HOUR + weighted(hours), randInt(0, 59));
  if (at.getTime() > now.getTime()) return null;

  const live = outlet.offers.filter((o) => isOfferLiveNow(o, at));
  if (live.length === 0) return null;
  const offer = pick(live);
  // Staff key in a real bill perhaps half the time; the rest fall back to the
  // merchant's indicative figure, which is what savedEstimated records.
  const typical = Number(offer.typicalSpend ?? offer.originalValue ?? offer.itemValue ?? 0);
  const basket = typical > 0 && chance(0.45) ? Math.round(typical * (0.7 + rand() * 0.7) * 100) / 100 : null;
  return { at, resident, outlet, offer, basket };
}

async function seedHistory(residents: SeededResident[], outlets: SeededOutlet[], now: Date) {
  const visits: Visit[] = [];
  for (const resident of residents) {
    const [min, max] = VISITS_BY_BAND[resident.band];
    const target = randInt(min, max);
    for (let made = 0, tries = 0; made < target && tries < target * 12; tries++) {
      const visit = buildVisit(resident, outlets, now);
      if (visit) (visits.push(visit), made++);
    }
  }
  visits.sort((a, b) => a.at.getTime() - b.at.getTime());

  const redemptionRows: Record<string, unknown>[] = [];
  const eventRows: Record<string, unknown>[] = [];
  const usage = new Map<string, number>();
  const codes = new Set<string>();
  // Status points drive the rolling tier, so they are accumulated in redemption
  // order: a balance written without matching events resolves to the base tier.
  const statusPoints = new Map<string, number>();
  const spendable = new Map<string, number>();

  for (const visit of visits) {
    const key = `${visit.outlet.id}:${visit.resident.id}`;
    let points = 0;
    if (visit.outlet.program) {
      const { tier } = resolveStatus(visit.outlet.tiers, statusPoints.get(key) ?? 0);
      points = pointsForRedemption(visit.outlet.program, tier?.pointsMultiplier ?? 1, visit.basket);
      statusPoints.set(key, (statusPoints.get(key) ?? 0) + points);
      spendable.set(key, (spendable.get(key) ?? 0) + points);
      eventRows.push({
        merchantId: visit.outlet.id, userId: visit.resident.id, programId: visit.outlet.programId, createdAt: visit.at,
        type: "earn_points", amount: points, metadata: { source: "redemption", offerId: visit.offer.id, basketAmount: visit.basket },
      });
    }
    const saving = estimateSaving(visit.offer, visit.basket);
    redemptionRows.push({
      offerId: visit.offer.id, merchantId: visit.outlet.id, userId: visit.resident.id, code: uniqueCode(codes),
      basketAmount: money(visit.basket), pointsAwarded: points, redeemedAt: visit.at,
      savedAmount: money(saving.amount), savedEstimated: saving.estimated,
    });
    usage.set(visit.offer.id, (usage.get(visit.offer.id) ?? 0) + 1);
  }

  await insertMany(redemptions, redemptionRows);
  await insertMany(loyaltyEvents, eventRows);
  for (const [offerId, count] of Array.from(usage)) {
    await db.update(offers).set({ usageCount: count }).where(sql`${offers.id} = ${offerId}`);
  }

  // A few reward claims, from the members who have the points for them.
  const claimRows: Record<string, unknown>[] = [];
  const claimEvents: Record<string, unknown>[] = [];
  for (const outlet of outlets) {
    const reward = outlet.rewards[0];
    if (!outlet.programId || !reward) continue;
    const cost = reward.costPoints ?? 0;
    for (const resident of residents.filter((r) => (spendable.get(`${outlet.id}:${r.id}`) ?? 0) >= cost).slice(0, 2)) {
      const at = new Date(now.getTime() - randInt(1, 45) * DAY_MS);
      const who = { merchantId: outlet.id, userId: resident.id };
      claimRows.push({ ...who, rewardId: reward.id, code: uniqueCode(codes), pointsSpent: cost, claimedAt: at });
      claimEvents.push({ ...who, programId: outlet.programId, type: "redeem_reward", amount: -cost, metadata: { rewardId: reward.id }, createdAt: at });
      spendable.set(`${outlet.id}:${resident.id}`, (spendable.get(`${outlet.id}:${resident.id}`) ?? 0) - cost);
    }
  }
  await insertMany(rewardClaims, claimRows);
  await insertMany(loyaltyEvents, claimEvents);

  // Balances last, so the stored tier matches the events already written.
  const balanceRows: Record<string, unknown>[] = [];
  for (const [key, points] of Array.from(spendable)) {
    const [merchantId, userId] = key.split(":");
    const outlet = outlets.find((o) => o.id === merchantId);
    if (!outlet) continue;
    const { tier } = resolveStatus(outlet.tiers, statusPoints.get(key) ?? 0);
    balanceRows.push({ merchantId, userId: Number(userId), points: Math.max(0, points), stamps: 0, tierId: tier?.id ?? null });
  }
  await insertMany(loyaltyBalances, balanceRows);

  // Favourites: the places a resident actually uses.
  const favouriteRows = residents.flatMap((r) =>
    r.regulars.slice(0, randInt(0, r.regulars.length)).map((o) => ({ userId: r.id, merchantId: o.id })),
  );
  await insertMany(favourites, favouriteRows);

  return { redemptions: redemptionRows.length, events: eventRows.length, balances: balanceRows.length, claims: claimRows.length, favourites: favouriteRows.length };
}

// Subscription ledger -----------------------------------------------------------

async function seedLedger(residents: SeededResident[], outlets: SeededOutlet[], now: Date): Promise<number> {
  const rows: Record<string, unknown>[] = [];
  for (const resident of residents) {
    if (resident.status === "inactive" || !resident.expiry) continue;
    const periodStart = addMonths(resident.expiry, -12);
    const base = {
      kind: "resident_membership", subjectId: String(resident.id), subjectName: resident.name, plan: resident.plan,
      periodStart, periodEnd: resident.expiry, source: "dev",
    };
    rows.push({ ...base, createdAt: periodStart,
      action: periodStart.getTime() < now.getTime() - 330 * DAY_MS ? "renewed" : "started",
      amountGbp: residentFeeGbp(resident.plan, config.residentAnnualFeeGbp).toFixed(2) });
    // A lapse is written at nil, so the forecast drops the member without double-counting the fee.
    if (resident.status === "cancelled") {
      rows.push({ ...base, action: "lapsed", amountGbp: "0.00", createdAt: resident.expiry });
    }
  }

  const fees = { standard: config.merchantStandardMonthlyFeeGbp, insight: config.merchantInsightMonthlyFeeGbp };
  for (const outlet of outlets) {
    if (outlet.plan === "free") continue;
    const amount = merchantFeeGbp(outlet.plan, fees);
    // One row a month from sign-up to now, so the revenue history has a curve.
    for (let period = outlet.planStartedAt, n = 0; period.getTime() < now.getTime(); period = addMonths(period, 1), n++) {
      rows.push({
        kind: "merchant_premium", subjectId: outlet.id, subjectName: outlet.name, plan: outlet.plan,
        action: n === 0 ? "started" : "renewed", amountGbp: amount.toFixed(2),
        periodStart: period, periodEnd: addMonths(period, 1), source: "dev", createdAt: period,
      });
    }
  }
  await insertMany(subscriptionEvents, rows);
  return rows.length;
}

// -------------------------------------------------------------------------------

async function main(): Promise<void> {
  // Refused outright in production, before anything is read or written: no flag overrides it.
  if (config.isProduction) throw new Error("seed:demo will not run in production.");
  const args = process.argv.slice(2);
  if (!args.includes("--yes")) {
    console.log("This replaces every non-admin account and all outlet data. Run again with --yes to confirm.");
    process.exit(1);
  }
  await assertDemoDatabase(args.includes("--force"));

  const now = new Date();
  const hash = await bcrypt.hash(PASSWORD, 10);
  await wipe();

  // An admin on .test too, so the revenue and approval screens can be shown without
  // hand-making one and without an account that could receive real email.
  if (!(await userStore.getUserByEmail("admin@resicard.test"))) {
    await userStore.createUser({ username: "demo_admin", email: "admin@resicard.test", password: hash, role: "admin" });
  }
  const outlets = await seedOutlets(hash, now);
  const residents = await seedResidents(hash, now, outlets);
  const history = await seedHistory(residents, outlets, now);
  const ledgerRows = await seedLedger(residents, outlets, now);

  const count = (plan: string) => outlets.filter((o) => o.plan === plan).length;
  const members = (status: string) => residents.filter((r) => r.status === status).length;
  const programmes = outlets.filter((o) => o.programId).length;
  console.log([
    `Seeded ${outlets.length} approved outlets: ${count("free")} free, ${count("standard")} standard, ${count("insight")} insight.`,
    `  ${outlets.reduce((n, o) => n + o.offers.length, 0)} offers; ${programmes} loyalty programmes, ${programmes * 3} tiers, ${programmes * 2} rewards.`,
    `  ${residents.length} residents: ${members("active")} active, ${members("cancelled")} lapsed, ${members("inactive")} never paid.`,
    `  ${history.redemptions} redemptions over ${HISTORY_DAYS} days, ${history.events} loyalty events, ${history.balances} balances,`,
    `  ${history.claims} reward claims, ${history.favourites} favourites, ${ledgerRows} subscription ledger rows.`,
    `Password for everyone: ${PASSWORD}. admin@resicard.test, resident01..60@resicard.test, owner@<outlet>.test.`,
    `  Insight outlets: ${outlets.filter((o) => o.plan === "insight").map((o) => `owner@${o.slug}.test (${o.name})`).join(", ")}`,
  ].join("\n"));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
