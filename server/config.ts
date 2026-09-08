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
  return isProduction ? "" : "resicard-dev-secret-change-me";
}

/**
 * Every link that leaves the building is built from this: referral share links,
 * password resets, campaign unsubscribes, the QR poster. Getting it wrong sends
 * people to the deployment host instead of resicard.co.uk, and it fails silently,
 * so production refuses to start without it.
 */
function readPublicBaseUrl(): string {
  const raw = process.env.PUBLIC_BASE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return isProduction ? "" : "http://localhost:5000";
}

/**
 * Hosts name the connection string differently: Replit's Postgres integration
 * sets DATABASE_URL, its Neon integration NEON_DATABASE_URL, and some platforms
 * POSTGRES_URL. Reading all three saves a crash loop over a variable that is in
 * fact present under another name.
 */
function readDatabaseUrl(): string {
  for (const name of ["DATABASE_URL", "NEON_DATABASE_URL", "POSTGRES_URL"]) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

/**
 * Everything production cannot run without, checked in one pass.
 *
 * Throwing on the first missing variable means discovering them one crash-loop
 * at a time, with a stack trace rather than an instruction. This says what is
 * missing, what it is for, and where to put it, all at once.
 */
export function assertProductionConfig(): void {
  if (!isProduction) return;
  const required: { name: string; value: string; why: string }[] = [
    { name: "DATABASE_URL", value: config.databaseUrl, why: "where the data lives; NEON_DATABASE_URL or POSTGRES_URL are accepted too" },
    { name: "JWT_SECRET", value: config.jwtSecret, why: "signs login tokens; a random 32+ character string" },
    { name: "PUBLIC_BASE_URL", value: config.publicBaseUrl, why: "every outgoing link is built from it, e.g. https://resicard.co.uk" },
  ];
  const missing = required.filter((r) => r.value.trim() === "");
  if (missing.length === 0) return;

  const lines = [
    "",
    "Resicard cannot start. These environment variables are not set:",
    "",
    ...missing.map((m) => `  ${m.name}  -  ${m.why}`),
    "",
    "Set them where the deployment reads its environment. On Replit that is the",
    "deployment's own secrets, which are separate from the workspace secrets: a",
    "variable set only in the workspace will not reach a deployed app.",
    "",
  ];
  throw new Error(lines.join("\n"));
}

export const config = {
  isProduction,
  jwtSecret: readJwtSecret(),
  databaseUrl: readDatabaseUrl(),
  publicBaseUrl: readPublicBaseUrl(),
  // Billed once a year, but quoted monthly: £3 a month reads as nothing, £36 reads as a decision.
  residentAnnualFeeGbp: readNumber("RESIDENT_ANNUAL_FEE_GBP", 36),
  merchantPremiumMonthlyFeeGbp: readNumber("MERCHANT_PREMIUM_MONTHLY_FEE_GBP", 30),
  // Standard is the old Premium tier renamed, so it falls back to whatever price this deployment already set.
  merchantStandardMonthlyFeeGbp: readNumber("MERCHANT_STANDARD_MONTHLY_FEE_GBP", readNumber("MERCHANT_PREMIUM_MONTHLY_FEE_GBP", 30)),
  merchantInsightMonthlyFeeGbp: readNumber("MERCHANT_INSIGHT_MONTHLY_FEE_GBP", 75),
  freePlanLiveOfferLimit: readNumber("FREE_PLAN_LIVE_OFFER_LIMIT", 2),
  freeTrialDays: readNumber("FREE_TRIAL_DAYS", 90), // free trial for a first-time resident or merchant; 0 turns trials off
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  adminSetupSecret: process.env.ADMIN_SETUP_SECRET ?? "",
  analyticsMinCohort: readNumber("ANALYTICS_MIN_COHORT", 5), // town benchmarks are hidden below this many outlets in a category
  // The public counter stays hidden until both figures clear this, because small
  // early numbers argue against joining and there is no honest way to dress them up.
  publicCounterMinimum: readNumber("PUBLIC_COUNTER_MIN", 40),
  townName: process.env.TOWN_NAME ?? "St Andrews", // the town this instance serves; shown on the card and the landing page
  localPostcodePrefixes: (process.env.LOCAL_POSTCODE_PREFIXES ?? "KY16,KY9,KY10,KY15 4,KY15 5")
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter((p) => p.length > 0),
  // Where the resident map opens. Defaults to the middle of St Andrews, near the
  // top of Market Street, which puts almost every outlet in the town on screen.
  // Served to the client at runtime rather than compiled in, so the key can be
  // set in the host's secrets and picked up on a restart. A VITE_ variable is
  // baked into the bundle at build time, which means a rebuild every time it
  // changes and a map that silently stays a list until someone works that out.
  // A demo dataset on a public site shows outlets that do not exist, and someone
  // could join expecting to use them. This puts an honest notice on every public
  // page rather than letting the site quietly imply partnerships it does not have.
  previewMode: (process.env.PREVIEW_MODE ?? "").trim().toLowerCase() === "true",
  mapTileUrl: (process.env.MAP_TILE_URL ?? process.env.VITE_MAP_TILE_URL ?? "").trim(),
  mapTileAttribution: (process.env.MAP_TILE_ATTRIBUTION ?? process.env.VITE_MAP_TILE_ATTRIBUTION ?? "").trim(),
  mapMaxZoom: readNumber("MAP_MAX_ZOOM", 18),
  mapCentreLat: readNumber("MAP_CENTRE_LAT", 56.339),
  mapCentreLng: readNumber("MAP_CENTRE_LNG", -2.795),
  // Web push. Without a key pair the feature is simply off: no subscription is
  // accepted and the composer says so, rather than a merchant sending into a void.
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:hello@resicard.co.uk",
  // Email. Without RESEND_API_KEY nothing is sent and every message is printed
  // to the server log instead, so a deployment with no keys still works.
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Resicard <hello@resicard.co.uk>",
  emailReplyTo: process.env.EMAIL_REPLY_TO ?? "hello@resicard.co.uk",
  // A sender's postal identity has to be on the message, so it is configuration
  // rather than a constant: whoever runs this instance is the sender.
  emailPostalAddress: process.env.EMAIL_POSTAL_ADDRESS ?? "Resicard, St Andrews, Fife, Scotland",
  // Bearer token for POST /api/jobs/daily. Empty means the route is closed.
  jobsSecret: process.env.JOBS_SECRET ?? "",
  postcardCodeDays: readNumber("POSTCARD_CODE_DAYS", 60),
  postcardMaxAttempts: readNumber("POSTCARD_MAX_ATTEMPTS", 5),
  // Where and when a resident can be verified in person. Configuration rather than
  // a hard-coded address, so it can say "get in touch and we will arrange it"
  // before there is a regular time and place, and change without a deploy.
  verifyInPersonDetails:
    process.env.VERIFY_IN_PERSON_DETAILS?.trim() ||
    "Get in touch and we will arrange a time and place that suits you.",
  port: readNumber("PORT", 5000),
} as const;

export type Config = typeof config;
