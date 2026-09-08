// Environment configuration with defaults. Read once at start-up.

const isProduction = process.env.NODE_ENV === "production";

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number, got "${raw}"`);
  }
  return value;
}

function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim() !== "") return secret;
  if (isProduction) {
    throw new Error("JWT_SECRET must be set in production");
  }
  return "resicard-dev-secret-change-me";
}

export const config = {
  isProduction,
  jwtSecret: readJwtSecret(),
  databaseUrl: process.env.DATABASE_URL ?? "",
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "http://localhost:5000").replace(/\/+$/, ""),
  residentAnnualFeeGbp: readNumber("RESIDENT_ANNUAL_FEE_GBP", 25),
  merchantPremiumMonthlyFeeGbp: readNumber("MERCHANT_PREMIUM_MONTHLY_FEE_GBP", 30),
  freePlanLiveOfferLimit: readNumber("FREE_PLAN_LIVE_OFFER_LIMIT", 2),
  freeTrialDays: readNumber("FREE_TRIAL_DAYS", 90), // free trial for a first-time resident or merchant; 0 turns trials off
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  adminSetupSecret: process.env.ADMIN_SETUP_SECRET ?? "",
  townName: process.env.TOWN_NAME ?? "St Andrews", // the town this instance serves; shown on the card and the landing page
  localPostcodePrefixes: (process.env.LOCAL_POSTCODE_PREFIXES ?? "KY16,KY15,KY10,DD6")
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter((p) => p.length > 0),
  postcardCodeDays: readNumber("POSTCARD_CODE_DAYS", 60),
  postcardMaxAttempts: readNumber("POSTCARD_MAX_ATTEMPTS", 5),
  port: readNumber("PORT", 5000),
} as const;

export type Config = typeof config;
