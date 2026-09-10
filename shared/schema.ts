import { pgTable, text, serial, integer, boolean, timestamp, uuid, date, numeric, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Resicard data model
//
// Three roles: resident, merchant, admin.
// Residents pay a flat annual membership. Merchants pay a flat monthly fee.
// A redemption is recorded when a resident scans the merchant's printed QR
// code (merchants.scanCode) and picks an offer. There is no per-redemption
// billing and no voucher step.
// ---------------------------------------------------------------------------

export const USER_ROLES = ["resident", "merchant", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** How a resident's address was confirmed. */
export const VERIFICATION_METHODS = ["postcard", "outlet", "in_person"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const MERCHANT_CATEGORIES = [
  "restaurant", "bar", "cafe", "pub", "takeaway", "hotel", "retail", "services", "experience",
] as const;

export const OFFER_TYPES = [
  "percentage_discount",
  "fixed_amount_discount",
  "fixed_price",
  "free_item_with_purchase",
  "bogo",
  "set_menu",
  "off_peak",
  "loyalty_reward",
] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // bcrypt hash
  firstName: text("first_name"),
  surname: text("surname"),
  role: text("role").$type<UserRole>().notNull(),
  postcode: text("postcode"),
  profilePhoto: text("profile_photo"), // base64 data URL, shown on the digital card

  // Residency verification (residents only). Three routes: a postcard with a
  // code posted to the address, an outlet that verifies on the operator's
  // behalf, or an admin verifying in person. No documents are stored.
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  town: text("town").default("St Andrews"),
  isResidencyVerified: boolean("is_residency_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by"), // the admin or staff user who did it, null for postcard
  verifiedByMerchantId: uuid("verified_by_merchant_id"), // which outlet, when verified at one
  verificationMethod: text("verification_method").$type<VerificationMethod>(),
  // The code the resident shows at a verifying outlet. Generated the first time
  // they look at the panel rather than for everyone at sign-up, and cleared when
  // it is used, so a code that has already granted residency cannot be used again.
  verificationCode: text("verification_code").unique(),

  // Membership (residents only): one flat annual fee, individual or household.
  // A household is two adults (children need no card). The paying adult is the
  // household's primary; the second adult joins with the primary's householdCode
  // and their membership follows the primary's.
  membershipPlan: text("membership_plan").$type<"individual" | "household">().default("individual"),
  membershipStatus: text("membership_status").$type<"inactive" | "active" | "cancelled">().default("inactive"),
  membershipExpiry: timestamp("membership_expiry"),
  membershipRenews: boolean("membership_renews").default(true), // false = downgrade to Free at expiry
  householdCode: text("household_code").unique(), // set on the primary of a household plan
  householdPrimaryId: integer("household_primary_id"), // set on the second adult
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  // The member's own referral code, generated the first time they look at it
  // rather than for everyone at sign-up, so codes exist only where they are used.
  referralCode: text("referral_code").unique(),

  // Marketing email is direct marketing under PECR, so it is explicit opt-in
  // and off until the resident turns it on. Web push is not here: the browser
  // permission prompt is that consent, recorded as a push_subscriptions row.
  marketingEmailOptIn: boolean("marketing_email_opt_in").default(false).notNull(),

  // Merchant users belong to a merchant record
  merchantId: uuid("merchant_id"),
  staffPin: text("staff_pin"),

  createdAt: timestamp("created_at").defaultNow(),
});

// A postcard with a code, posted to the resident's address by an admin.
export const postcards = pgTable("postcards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(), // sha256 of the 6-character code
  addressSnapshot: text("address_snapshot").notNull(), // the full address as printed
  status: text("status").$type<"requested" | "posted" | "used" | "expired" | "cancelled">().default("requested"),
  requestedAt: timestamp("requested_at").defaultNow(),
  postedAt: timestamp("posted_at"),
  postedBy: integer("posted_by"),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  requestIp: text("request_ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export const EMAIL_KINDS = [
  "password_reset",
  "welcome",
  "postcard_posted",
  "verified",
  "trial_ending",
  "renewal_30",
  "renewal_7",
  "membership_lapsed",
  "merchant_approved",
  "points_expiring",
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

// One row per message actually sent. `dedupeKey` is what makes the daily job safe
// to run as often as anyone likes: the row is written in the same transaction as
// the send, so a message either went out and is recorded, or neither.
export const emailLog = pgTable("email_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").$type<EmailKind>().notNull(),
  dedupeKey: text("dedupe_key").notNull().unique(),
  sentAt: timestamp("sent_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

// A code entered at registration. It stays pending until the referred member's
// first payment succeeds, because paying first is the whole anti-fraud design.
export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerId: integer("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referredId: integer("referred_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  status: text("status").$type<"pending" | "credited">().notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  creditedAt: timestamp("credited_at"),
});

// ---------------------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------------------

export const merchants = pgTable("merchants", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: integer("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  logoUrl: text("logo_url"),
  businessHours: text("business_hours"), // JSON string
  reservationProvider: text("reservation_provider"),
  reservationUrl: text("reservation_url"),

  // Where the outlet sits on the map. Nullable on purpose: an outlet with no
  // coordinates keeps working everywhere else and is listed under the map
  // rather than pinned on it. Set by hand, never geocoded.
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),

  // The printed QR code in the outlet encodes /scan/<scanCode>
  scanCode: text("scan_code").notNull().unique(),

  // Whether this outlet may verify a resident's address on the operator's
  // behalf. Off unless an admin turns it on: it delegates the right to grant
  // residency, so it is never a merchant setting (see updateMerchantSchema).
  verifiesResidents: boolean("verifies_residents").default(false).notNull(),

  // Admin approval
  status: text("status").$type<"pending" | "approved" | "rejected">().default("pending"),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by"),

  // Plan: Free (capped) or Premium (monthly fee; unlocks loyalty, analytics,
  // unlimited live offers).
  planStatus: text("plan_status").$type<"free" | "standard" | "insight">().default("free"),
  planStartedAt: timestamp("plan_started_at").defaultNow(),
  planRenewsAt: timestamp("plan_renews_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  createdAt: timestamp("created_at").defaultNow(),
});

/** Outlets a resident has starred, so their usual places come first. */
export const favourites = pgTable(
  "favourites",
  {
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.merchantId] }) }),
);

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description"),
  shortPromo: text("short_promo"), // <= 90 chars, shown on cards
  type: text("type").$type<OfferType>().default("percentage_discount"),
  percentOff: integer("percent_off"),
  fixedPrice: numeric("fixed_price", { precision: 10, scale: 2 }),
  originalValue: numeric("original_value", { precision: 10, scale: 2 }),
  category: text("category"),

  // Indicative figures, set by the merchant, used only to estimate what a
  // resident saved. Never shown as a price and never billed on.
  typicalSpend: numeric("typical_spend", { precision: 10, scale: 2 }), // typical bill a percentage offer is used on
  itemValue: numeric("item_value", { precision: 10, scale: 2 }), // usual price of the free / second / reward item

  tags: jsonb("tags").$type<string[]>(),

  // Eligibility
  eligibleTiers: jsonb("eligible_tiers").$type<string[]>(), // loyalty tier IDs; empty = everyone
  minBasket: numeric("min_basket", { precision: 10, scale: 2 }),
  maxDiscount: numeric("max_discount", { precision: 10, scale: 2 }),
  stackable: boolean("stackable").default(false),
  newCustomerOnly: boolean("new_customer_only").default(false),

  // Scheduling
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  daysOfWeek: jsonb("days_of_week").$type<string[]>(), // ["mon","tue",...]; empty = every day
  timeSlots: jsonb("time_slots").$type<Record<string, { start: string; end: string }[]>>(),
  blackoutDates: jsonb("blackout_dates").$type<{ name: string; startDate: string; endDate: string }[]>(),

  // Limits
  maxPerDay: integer("max_per_day"), // per resident
  maxPerWeek: integer("max_per_week"),
  maxLifetime: integer("max_lifetime"),
  globalUsageLimit: integer("global_usage_limit"),
  usageCount: integer("usage_count").default(0),

  // Terms
  terms: text("terms"),
  dineInOnly: boolean("dine_in_only").default(false),
  excludesAlcohol: boolean("excludes_alcohol").default(false),

  // Media
  imageUrl: text("image_url"),
  menuPdf: text("menu_pdf"), // base64 PDF for set menus
  priority: text("priority").$type<"standard" | "featured">().default("standard"),

  active: boolean("active").default(true),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Redemptions (one row per scan-and-redeem)
// ---------------------------------------------------------------------------

export const redemptions = pgTable("redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").notNull().references(() => offers.id),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  code: text("code").notNull().unique(), // short code shown on the success screen
  basketAmount: numeric("basket_amount", { precision: 10, scale: 2 }),
  pointsAwarded: integer("points_awarded").default(0),
  // What the resident saved, frozen at redemption time so later edits to the
  // offer cannot rewrite history. Null when there was nothing to work from.
  savedAmount: numeric("saved_amount", { precision: 10, scale: 2 }),
  // True when savedAmount came from indicative figures rather than a real bill.
  savedEstimated: boolean("saved_estimated").default(true),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Loyalty (per merchant)
// ---------------------------------------------------------------------------

// The merchant's card design, kept to a short list so every card stays legible
// and the wallet reads as one app. Rendered by client/src/components/loyalty/card-themes.ts.
/*
  Card colours. The first six were all deep and desaturated, so a merchant
  choosing between them was picking between six shades of dark. The eight after
  them carry real colour. Stored as text, not a database enum, so adding to this
  list needs no migration — but never REMOVE one: an outlet that chose it would
  silently fall back to sea and find its card had changed colour overnight.
*/
export const CARD_THEMES = [
  "sea", "ink", "moss", "rust", "plum", "sand",
  "lagoon", "kelp", "harbour", "berry", "buoy", "gorse", "shell", "haar",
] as const;
export type CardTheme = (typeof CARD_THEMES)[number];

export const CARD_PATTERNS = ["plain", "wave", "stripe"] as const;
export type CardPattern = (typeof CARD_PATTERNS)[number];

/**
 * Till staff: a name and a four-digit PIN, and nothing else.
 *
 * Awarding points at the till used to require a full user account per person —
 * username, email, password. No pub is going to create eight logins for eight bar
 * staff, so in practice nobody had a PIN and the till tool went unused. These
 * rows are not accounts: they cannot sign in anywhere, they have no email, and
 * the only thing they can do is identify who was on the till.
 *
 * Portal access is still a real account (the owner, a manager) and is unchanged.
 */
export const merchantStaff = pgTable("merchant_staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** bcrypt hash. A four-digit PIN is weak by design, so it is never stored in the clear. */
  pin: text("pin").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyPrograms = pgTable("loyalty_programs", {
  id: serial("id").primaryKey(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }).unique(),
  pointsPerCurrency: integer("points_per_currency").default(10), // points per £1
  pointsPerRedemption: integer("points_per_redemption").default(10), // awarded on a scan when no basket amount is given
  minBasketEarn: numeric("min_basket_earn", { precision: 10, scale: 2 }).default("0.00"),
  earnCooldownMinutes: integer("earn_cooldown_minutes").default(30),
  dailyEarnCap: integer("daily_earn_cap").default(3),
  stackingAllowed: boolean("stacking_allowed").default(false),
  expiryDays: integer("expiry_days"),
  tierWindowDays: integer("tier_window_days").default(365), // tier status is based on points earned in this rolling window
  // How the resident's card for this outlet is drawn. A fixed set, not free
  // colours: free rein produces unreadable cards and six different-looking apps.
  cardTheme: text("card_theme").$type<CardTheme>().default("sea"),
  cardPattern: text("card_pattern").$type<CardPattern>().default("plain"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: integer("program_id").notNull().references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  thresholdPoints: integer("threshold_points").notNull(),
  discountPercent: integer("discount_percent"), // optional flat discount shown on the outlet loyalty card; null = none
  pointsMultiplier: numeric("points_multiplier", { precision: 3, scale: 2 }).default("1.00"),
  color: text("color").default("#f97316"),
  sortOrder: integer("sort_order").default(0),
});

export const loyaltyBalances = pgTable("loyalty_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").default(0),
  tierId: uuid("tier_id").references(() => loyaltyTiers.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loyaltyEvents = pgTable("loyalty_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  programId: integer("program_id").notNull().references(() => loyaltyPrograms.id),
  type: text("type").$type<"earn_points" | "redeem_reward" | "adjust" | "tier_change">().notNull(),
  amount: integer("amount"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: integer("program_id").notNull().references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  costPoints: integer("cost_points"), // null or 0 with a tierId = a tier benefit
  tierId: uuid("tier_id").references(() => loyaltyTiers.id, { onDelete: "cascade" }), // only members of this tier (or above) can claim
  claimRule: text("claim_rule").$type<"once" | "weekly" | "monthly" | "unlimited">().default("unlimited"),
  terms: text("terms"),
  active: boolean("active").default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// A reward claimed with points. Shown to staff on the same green screen as an
// offer redemption and listed in the merchant's feed.
export const rewardClaims = pgTable("reward_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  rewardId: uuid("reward_id").notNull().references(() => loyaltyRewards.id),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  code: text("code").notNull().unique(),
  pointsSpent: integer("points_spent").default(0),
  claimedAt: timestamp("claimed_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Campaigns: a merchant pushing one live offer to residents.
//
// The limits (one a week, four a month, 08:00-20:00 only, always an existing
// offer and never free text) live in server/lib/campaigns.ts and are applied on
// every send. Nothing here is a merchant setting, deliberately.
// ---------------------------------------------------------------------------

// A browser push subscription. Its existence is the resident's consent: the
// browser prompt is what they answered, and revoking it deletes the row.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  body: text("body").notNull(), // <= 140 characters
  audience: text("audience").$type<"all" | "favourites" | "past">().notNull().default("all"),
  status: text("status").$type<"queued" | "sending" | "sent" | "failed">().notNull().default("queued"),
  // When it goes out. Set at creation: now inside the window, otherwise 08:00 next.
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  recipients: integer("recipients").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// A resident's opt-out. A null merchantId means every outlet, which is why the
// primary key carries a sentinel uuid rather than a nullable column: Postgres
// primary keys cannot be null, and a partial unique index would not be enforced
// by the composite key the contract asks for.
export const CAMPAIGN_OPTOUT_ALL = "00000000-0000-0000-0000-000000000000";

export const campaignOptouts = pgTable(
  "campaign_optouts",
  {
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    merchantId: uuid("merchant_id").notNull(), // CAMPAIGN_OPTOUT_ALL = every outlet
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.merchantId] }) }),
);

// ---------------------------------------------------------------------------
// Subscription ledger: one row per payment or plan change, so revenue can be
// reported and forecast without asking Stripe.
// ---------------------------------------------------------------------------

export const subscriptionEvents = pgTable("subscription_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").$type<"resident_membership" | "merchant_premium">().notNull(),
  subjectId: text("subject_id").notNull(), // users.id as text, or merchants.id
  subjectName: text("subject_name"), // snapshot for reporting
  plan: text("plan"), // individual | household | premium
  action: text("action").$type<"started" | "renewed" | "cancelled" | "lapsed">().notNull(),
  amountGbp: numeric("amount_gbp", { precision: 10, scale: 2 }).default("0"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  source: text("source").$type<"stripe" | "dev" | "admin" | "backfill">().default("dev"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Price change audit: one row per figure a merchant changed on an offer.
//
// The old figure is overwritten by the update, so unless it is written down at
// the moment of the edit it cannot be recovered later. This is a record of what
// changed, nothing more.
// ---------------------------------------------------------------------------

export const PRICE_CHANGE_FIELDS = [
  "percentOff", "fixedPrice", "originalValue", "typicalSpend", "itemValue", "minBasket", "maxDiscount",
] as const;
export type PriceChangeField = (typeof PRICE_CHANGE_FIELDS)[number];

export const PRICE_CHANGE_DIRECTIONS = ["up", "down", "set", "cleared"] as const;
export type PriceChangeDirection = (typeof PRICE_CHANGE_DIRECTIONS)[number];

export const offerPriceChanges = pgTable("offer_price_changes", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  changedBy: integer("changed_by").references(() => users.id), // the merchant user who saved the edit
  field: text("field").$type<PriceChangeField>().notNull(),
  // percentOff is an integer on the offer and is kept here as a plain number.
  oldValue: numeric("old_value", { precision: 10, scale: 2 }),
  newValue: numeric("new_value", { precision: 10, scale: 2 }),
  direction: text("direction").$type<PriceChangeDirection>().notNull(),
  inflatesSaving: boolean("inflates_saving").default(false).notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
});

export type OfferPriceChange = typeof offerPriceChanges.$inferSelect;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const merchantRelations = relations(merchants, ({ one, many }) => ({
  owner: one(users, { fields: [merchants.ownerUserId], references: [users.id] }),
  offers: many(offers),
  redemptions: many(redemptions),
  loyaltyProgram: one(loyaltyPrograms, { fields: [merchants.id], references: [loyaltyPrograms.merchantId] }),
}));

export const offerRelations = relations(offers, ({ one, many }) => ({
  merchant: one(merchants, { fields: [offers.merchantId], references: [merchants.id] }),
  redemptions: many(redemptions),
}));

export const redemptionRelations = relations(redemptions, ({ one }) => ({
  offer: one(offers, { fields: [redemptions.offerId], references: [offers.id] }),
  merchant: one(merchants, { fields: [redemptions.merchantId], references: [merchants.id] }),
  user: one(users, { fields: [redemptions.userId], references: [users.id] }),
}));

export const loyaltyProgramRelations = relations(loyaltyPrograms, ({ one, many }) => ({
  merchant: one(merchants, { fields: [loyaltyPrograms.merchantId], references: [merchants.id] }),
  tiers: many(loyaltyTiers),
  rewards: many(loyaltyRewards),
  events: many(loyaltyEvents),
}));

export const loyaltyTierRelations = relations(loyaltyTiers, ({ one, many }) => ({
  program: one(loyaltyPrograms, { fields: [loyaltyTiers.programId], references: [loyaltyPrograms.id] }),
  balances: many(loyaltyBalances),
}));

export const loyaltyBalanceRelations = relations(loyaltyBalances, ({ one }) => ({
  merchant: one(merchants, { fields: [loyaltyBalances.merchantId], references: [merchants.id] }),
  user: one(users, { fields: [loyaltyBalances.userId], references: [users.id] }),
  tier: one(loyaltyTiers, { fields: [loyaltyBalances.tierId], references: [loyaltyTiers.id] }),
}));

// ---------------------------------------------------------------------------
// Insert schemas (zod) and types
// ---------------------------------------------------------------------------

const optionalNumber = z
  .union([z.number(), z.string(), z.null()])
  .transform((v) => (typeof v === "string" ? (v.trim() === "" ? null : Number(v)) : v))
  .optional()
  .nullable();

// A resident's username is generated by the server (see server/lib/codes.ts), so
// nothing a resident chose can identify them to a merchant through their alias.
export const registerResidentSchema = z.object({
  role: z.literal("resident"),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  surname: z.string().min(1),
  postcode: z.string().min(5),
  addressLine1: z.string().trim().min(3).max(80),
  addressLine2: z.string().trim().max(80).optional().nullable(),
  town: z.string().trim().min(2).max(40).default("St Andrews"),
  profilePhoto: z.string().optional(),
  // Optional, and only ever accepted here. An unknown code is ignored rather than
  // refused: nothing about a referral is worth blocking a sign-up over.
  referralCode: z.string().trim().max(20).optional(),
});

export const registerMerchantSchema = z.object({
  role: z.literal("merchant"),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  surname: z.string().min(1),
  businessName: z.string().min(1),
  businessCategory: z.enum(MERCHANT_CATEGORIES),
  businessAddress: z.string().min(1),
  businessPhone: z.string().min(5),
});

export const registerSchema = z.discriminatedUnion("role", [registerResidentSchema, registerMerchantSchema]);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  surname: z.string().min(1).optional(),
  postcode: z.string().min(5).optional(),
  addressLine1: z.string().trim().min(3).max(80).optional(),
  addressLine2: z.string().trim().max(80).optional().nullable(),
  town: z.string().trim().min(2).max(40).optional(),
  profilePhoto: z.string().optional(),
});

export const addressSchema = z.object({
  addressLine1: z.string().trim().min(3).max(80),
  addressLine2: z.string().trim().max(80).optional().nullable(),
  town: z.string().trim().min(2).max(40).default("St Andrews"),
  postcode: z.string().trim().min(5).max(10),
});

export const postcardCodeSchema = z.object({
  code: z.string().trim().min(6).max(6),
});

/**
 * A map coordinate on its way into a `numeric(9,6)` column. Accepts a number or a
 * string because the merchant form types one and the map pin drags another, and
 * hands Drizzle the string that column wants. An empty string clears the pin.
 */
const coordinate = (limit: number) =>
  z
    .union([z.number(), z.string()])
    .nullable()
    .transform((value) => (value === null || value === "" ? null : Number(value)))
    .refine((value) => value === null || (Number.isFinite(value) && Math.abs(value) <= limit), {
      message: `Must be a number between -${limit} and ${limit}`,
    })
    // Outermost, so an update that leaves the fields out does not clear the pin.
    .transform((value) => (value === null ? null : value.toFixed(6)))
    .optional();

/**
 * What a merchant may change about their own record.
 *
 * `verifiesResidents` is deliberately absent and must stay absent: this schema
 * is what the merchant settings route parses, and zod drops the keys it does
 * not list, so an outlet cannot switch on its own right to verify residents by
 * posting the field. Admins use adminUpdateMerchantSchema instead.
 */
export const updateMerchantSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(MERCHANT_CATEGORIES).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  businessHours: z.string().optional().nullable(),
  reservationProvider: z.string().optional().nullable(),
  reservationUrl: z.string().url().optional().nullable().or(z.literal("")),
  latitude: coordinate(90),
  longitude: coordinate(180),
});

/** The same fields plus the ones only an admin may set. Used by the admin merchants route. */
export const adminUpdateMerchantSchema = updateMerchantSchema.extend({
  verifiesResidents: z.boolean().optional(),
});

/** A resident's verification code, as typed by outlet staff. */
export const verificationCodeSchema = z.object({
  code: z.string().trim().min(6).max(6),
});

/** Verifying a resident at an outlet. The confirmation is the whole point: staff say they have seen the address. */
export const outletVerifySchema = verificationCodeSchema.extend({
  confirmed: z.literal(true),
});

export const insertOfferSchema = createInsertSchema(offers)
  .pick({
    title: true,
    description: true,
    shortPromo: true,
    type: true,
    category: true,
    stackable: true,
    newCustomerOnly: true,
    terms: true,
    dineInOnly: true,
    excludesAlcohol: true,
    imageUrl: true,
    menuPdf: true,
    priority: true,
    active: true,
  })
  .extend({
    type: z.enum(OFFER_TYPES).default("percentage_discount"),
    percentOff: optionalNumber,
    fixedPrice: optionalNumber,
    originalValue: optionalNumber,
    typicalSpend: optionalNumber,
    itemValue: optionalNumber,
    minBasket: optionalNumber,
    maxDiscount: optionalNumber,
    maxPerDay: optionalNumber,
    maxPerWeek: optionalNumber,
    maxLifetime: optionalNumber,
    globalUsageLimit: optionalNumber,
    tags: z.array(z.string()).optional(),
    eligibleTiers: z.array(z.string()).optional(),
    daysOfWeek: z.array(z.string()).optional(),
    timeSlots: z.record(z.array(z.object({ start: z.string(), end: z.string() }))).optional(),
    blackoutDates: z
      .array(z.object({ name: z.string(), startDate: z.string(), endDate: z.string() }))
      .optional(),
    validFrom: z.string().optional().nullable(),
    validTo: z.string().optional().nullable(),
  });

export const updateOfferSchema = insertOfferSchema.partial();

export const membershipCheckoutSchema = z.object({
  plan: z.enum(["individual", "household"]).default("individual"),
});

export const householdJoinSchema = z.object({
  code: z.string().min(4).max(20),
});

export const scanRedeemSchema = z.object({
  scanCode: z.string().min(4),
  offerId: z.string().uuid(),
  basketAmount: optionalNumber,
});

export const insertLoyaltyProgramSchema = createInsertSchema(loyaltyPrograms)
  .omit({ id: true, merchantId: true, createdAt: true })
  .extend({
    tierWindowDays: z.number().int().min(30).max(1095).optional(),
    // Points lapse after this long without a visit; null is never. The floor is
    // the same MIN_EXPIRY_DAYS the job enforces, stated here so a merchant is
    // told at the point of setting it rather than finding it quietly overridden.
    expiryDays: z.number().int().min(90).max(3650).nullable().optional(),
  });
export const insertLoyaltyTierSchema = createInsertSchema(loyaltyTiers)
  .omit({ id: true, programId: true })
  .extend({
    discountPercent: z.number().int().min(1).max(100).nullable().optional(),
  });
export const insertLoyaltyRewardSchema = createInsertSchema(loyaltyRewards)
  .omit({ id: true, programId: true, createdAt: true })
  .extend({
    costPoints: z.number().int().min(0).nullable().optional(),
    tierId: z.string().uuid().nullable().optional(),
    claimRule: z.enum(["once", "weekly", "monthly", "unlimited"]).default("unlimited"),
  });

// A campaign is an offer plus one short line. There is no free-text send: the
// offer is what the resident is promised and what they can then redeem.
export const createCampaignSchema = z.object({
  offerId: z.string().uuid(),
  body: z.string().trim().min(1, "Write a line for residents").max(140, "Keep it to 140 characters"),
  audience: z.enum(["all", "favourites", "past"]).default("all"),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(255), auth: z.string().min(1).max(255) }),
});

export const pushUnsubscribeSchema = z.object({ endpoint: z.string().url().max(1000) });

export const campaignPreferencesSchema = z.object({
  marketingEmailOptIn: z.boolean().optional(),
  optOutAll: z.boolean().optional(),
  // Outlets to stop hearing from. Sent whole, so unticking one is a plain replace.
  optedOutMerchantIds: z.array(z.string().uuid()).max(500).optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
/** A user as returned over the API: every column but the password hash. */
export type PublicUser = Omit<User, "password">;
export type Postcard = typeof postcards.$inferSelect;
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = typeof merchants.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Redemption = typeof redemptions.$inferSelect;
export type LoyaltyProgram = typeof loyaltyPrograms.$inferSelect;
export type MerchantStaff = typeof merchantStaff.$inferSelect;
export type LoyaltyTier = typeof loyaltyTiers.$inferSelect;
export type LoyaltyBalance = typeof loyaltyBalances.$inferSelect;
export type LoyaltyEvent = typeof loyaltyEvents.$inferSelect;
export type LoyaltyReward = typeof loyaltyRewards.$inferSelect;
export type RewardClaim = typeof rewardClaims.$inferSelect;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type Favourite = typeof favourites.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type EmailLogEntry = typeof emailLog.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type CampaignOptout = typeof campaignOptouts.$inferSelect;

/** Alias shown to merchants instead of a resident's real name. */
export function generateCustomerAlias(user: { id: number; username?: string | null }): string {
  return user.username ? user.username : `member_${String(user.id).padStart(5, "0")}`;
}
