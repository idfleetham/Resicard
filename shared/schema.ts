import { pgTable, text, serial, integer, boolean, timestamp, uuid, date, numeric, jsonb } from "drizzle-orm/pg-core";
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

  // Residency verification (residents only)
  documentType: text("document_type"), // driving_licence | bank_statement | utility_bill | council_tax
  documentFile: text("document_file"), // base64 data URL
  documentStatus: text("document_status").$type<"pending" | "approved" | "rejected">(),
  documentSubmittedAt: timestamp("document_submitted_at"),
  documentReviewedAt: timestamp("document_reviewed_at"),
  documentReviewedBy: integer("document_reviewed_by"),
  documentRejectionReason: text("document_rejection_reason"),
  isResidencyVerified: boolean("is_residency_verified").default(false),

  // Membership (residents only): one flat annual fee, individual or household.
  // A household is two adults (children need no card). The paying adult is the
  // household's primary; the second adult joins with the primary's householdCode
  // and their membership follows the primary's.
  membershipPlan: text("membership_plan").$type<"individual" | "household">().default("individual"),
  membershipStatus: text("membership_status").$type<"inactive" | "active" | "cancelled">().default("inactive"),
  membershipExpiry: timestamp("membership_expiry"),
  householdCode: text("household_code").unique(), // set on the primary of a household plan
  householdPrimaryId: integer("household_primary_id"), // set on the second adult
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  // Merchant users belong to a merchant record
  merchantId: uuid("merchant_id"),
  staffPin: text("staff_pin"),

  createdAt: timestamp("created_at").defaultNow(),
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

  // The printed QR code in the outlet encodes /scan/<scanCode>
  scanCode: text("scan_code").notNull().unique(),

  // Admin approval
  status: text("status").$type<"pending" | "approved" | "rejected">().default("pending"),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by"),

  // Plan: Free (capped) or Premium (monthly fee; unlocks loyalty, analytics,
  // unlimited live offers).
  planStatus: text("plan_status").$type<"free" | "premium">().default("free"),
  planStartedAt: timestamp("plan_started_at").defaultNow(),
  planRenewsAt: timestamp("plan_renews_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  createdAt: timestamp("created_at").defaultNow(),
});

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
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Loyalty (per merchant)
// ---------------------------------------------------------------------------

export const loyaltyPrograms = pgTable("loyalty_programs", {
  id: serial("id").primaryKey(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }).unique(),
  model: text("model").$type<"points" | "stamps">().default("points"),
  pointsPerCurrency: integer("points_per_currency").default(10), // points per £1
  pointsPerRedemption: integer("points_per_redemption").default(10), // awarded on a scan when no basket amount is given
  minBasketEarn: numeric("min_basket_earn", { precision: 10, scale: 2 }).default("0.00"),
  earnCooldownMinutes: integer("earn_cooldown_minutes").default(30),
  dailyEarnCap: integer("daily_earn_cap").default(3),
  stackingAllowed: boolean("stacking_allowed").default(false),
  expiryDays: integer("expiry_days"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: integer("program_id").notNull().references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  thresholdPoints: integer("threshold_points").notNull(),
  discountPercent: integer("discount_percent").default(0),
  pointsMultiplier: numeric("points_multiplier", { precision: 3, scale: 2 }).default("1.00"),
  color: text("color").default("#f97316"),
  sortOrder: integer("sort_order").default(0),
});

export const loyaltyBalances = pgTable("loyalty_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").default(0),
  stamps: integer("stamps").default(0),
  tierId: uuid("tier_id").references(() => loyaltyTiers.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loyaltyEvents = pgTable("loyalty_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  programId: integer("program_id").notNull().references(() => loyaltyPrograms.id),
  type: text("type").$type<"earn_points" | "earn_stamp" | "redeem_reward" | "adjust" | "tier_change">().notNull(),
  amount: integer("amount"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: integer("program_id").notNull().references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  costPoints: integer("cost_points"),
  costStamps: integer("cost_stamps"),
  terms: text("terms"),
  active: boolean("active").default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const registerResidentSchema = z.object({
  role: z.literal("resident"),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  surname: z.string().min(1),
  postcode: z.string().min(5),
  profilePhoto: z.string().optional(),
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
  profilePhoto: z.string().optional(),
});

export const submitDocumentSchema = z.object({
  documentType: z.enum(["driving_licence", "bank_statement", "utility_bill", "council_tax"]),
  documentFile: z.string().min(1),
});

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

export const insertLoyaltyProgramSchema = createInsertSchema(loyaltyPrograms).omit({
  id: true,
  merchantId: true,
  createdAt: true,
});
export const insertLoyaltyTierSchema = createInsertSchema(loyaltyTiers).omit({ id: true, programId: true });
export const insertLoyaltyRewardSchema = createInsertSchema(loyaltyRewards).omit({ id: true, programId: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PublicUser = Omit<User, "password" | "documentFile">;
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = typeof merchants.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Redemption = typeof redemptions.$inferSelect;
export type LoyaltyProgram = typeof loyaltyPrograms.$inferSelect;
export type LoyaltyTier = typeof loyaltyTiers.$inferSelect;
export type LoyaltyBalance = typeof loyaltyBalances.$inferSelect;
export type LoyaltyEvent = typeof loyaltyEvents.$inferSelect;
export type LoyaltyReward = typeof loyaltyRewards.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

/** Alias shown to merchants instead of a resident's real name. */
export function generateCustomerAlias(user: { id: number; username?: string | null }): string {
  return user.username ? user.username : `member_${String(user.id).padStart(5, "0")}`;
}
