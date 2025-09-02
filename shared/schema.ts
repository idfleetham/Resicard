import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, date, numeric, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  surname: text("surname"),
  role: text("role").notNull(), // 'resident', 'merchant', 'admin'
  isVerified: boolean("is_verified").default(false),
  postcode: text("postcode"),
  businessName: text("business_name"),
  businessCategory: text("business_category"),
  businessAddress: text("business_address"),
  businessPhone: text("business_phone"),
  profilePhoto: text("profile_photo"), // Base64 encoded image for membership card
  subscriptionType: text("subscription_type"), // 'individual' or 'family'
  subscriptionPlan: text("subscription_plan"), // 'monthly' or 'annual'
  subscriptionStatus: text("subscription_status").default("inactive"), // 'active', 'inactive', 'cancelled'
  membershipExpiry: timestamp("membership_expiry"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Document verification fields
  documentType: text("document_type"), // "driving_license", "bank_statement", "utility_bill", "passport"
  documentFile: text("document_file"), // Base64 encoded document
  documentStatus: text("document_status"), // "pending", "approved", "rejected"
  documentSubmittedAt: timestamp("document_submitted_at"),
  documentReviewedAt: timestamp("document_reviewed_at"),
  documentReviewedBy: integer("document_reviewed_by"),
  isResidencyVerified: boolean("is_residency_verified").default(false),
  // Merchant portal fields (removed foreign key constraint to avoid migration issues)
  merchantId: uuid("merchant_id"),
  staffPin: text("staff_pin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const billingRuns = pgTable("billing_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  redemptionCount: integer("redemption_count").default(0),
  feeType: text("fee_type").$type<"per_redemption"|"percent_of_discount">().default("per_redemption"),
  feeValue: numeric("fee_value", { precision: 10, scale: 2 }).default("0.50"),
  totalFees: numeric("total_fees", { precision: 12, scale: 2 }).default("0.00"),
  status: text("status").$type<"draft"|"pending_dd"|"collected">().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  age: integer("age").notNull(),
  relationship: text("relationship").notNull(), // 'spouse', 'child', 'other'
  createdAt: timestamp("created_at").defaultNow(),
});

// Merchant entities
export const merchants = pgTable("merchants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  logoUrl: text("logo_url"),
  businessHours: text("business_hours"), // JSON string
  apiKey: text("api_key"),
  reservationProvider: text("reservation_provider"), // e.g., "opentable", "resy", "bookatable", "custom"
  reservationUrl: text("reservation_url"), // URL for the reservation system
  createdAt: timestamp("created_at").defaultNow(),
});

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  
  // A) Core & pricing
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").$type<"percentage_discount"|"fixed_amount_discount"|"fixed_price_bundle"|"free_item_with_purchase"|"bogo"|"day_time_specific"|"limited_redemptions"|"loyalty_reward">().default("percentage_discount"),
  percentOff: integer("percent_off"), // For percentage discounts
  fixedPrice: numeric("fixed_price", { precision: 10, scale: 2 }), // For fixed price offers
  originalValue: numeric("original_value", { precision: 10, scale: 2 }),
  category: text("category"), // Food & Drink, Retail, Services
  tags: text("tags"), // JSON array: ["happy-hour", "lunch", "family"]
  
  // B) Visibility & eligibility
  audience: text("audience").$type<"resident"|"student"|"both">().default("both"),
  minBasket: numeric("min_basket", { precision: 10, scale: 2 }), // Min spend requirement
  maxDiscount: numeric("max_discount", { precision: 10, scale: 2 }), // Cap on discount value
  stackable: boolean("stackable").default(false), // Can stack with other promos
  newCustomerOnly: boolean("new_customer_only").default(false),
  locations: text("locations"), // JSON array of location IDs
  geofenceRadius: integer("geofence_radius"), // Meters from venue
  
  // C) Scheduling
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  daysOfWeek: text("days_of_week"), // JSON array: ["mon","tue","wed"]
  timeSlots: text("time_slots"), // JSON: {mon: [{start:"12:00",end:"14:30"}]}
  blackoutDates: text("blackout_dates"), // JSON array of date ranges
  leadTime: integer("lead_time"), // Minutes between redemptions
  
  // D) Redemption rules & limits
  maxPerTransaction: integer("max_per_transaction").default(1),
  maxPerDay: integer("max_per_day"),
  maxPerWeek: integer("max_per_week"),
  maxLifetime: integer("max_lifetime"),
  globalUsageLimit: integer("global_usage_limit"),
  usageCount: integer("usage_count").default(0),
  usageLimit: integer("usage_limit"), // Make nullable to match database
  voucherTimeoutHours: integer("voucher_timeout_hours").default(24), // Hours to make booking after claiming voucher
  staffPinRequired: boolean("staff_pin_required").default(false),
  proofType: text("proof_type").$type<"qr_only"|"code_pin"|"app_checkin">().default("qr_only"),
  refundBehavior: text("refund_behavior").$type<"restore"|"consume">().default("consume"),
  
  // E) Terms & conditions
  terms: text("terms"),
  dineInOnly: boolean("dine_in_only").default(false),
  excludesAlcohol: boolean("excludes_alcohol").default(false),
  serviceChargeIncluded: boolean("service_charge_included").default(true),
  validOnBankHolidays: boolean("valid_on_bank_holidays").default(true),
  
  // F) Media & presentation
  imageUrl: text("image_url"),
  shortPromo: text("short_promo"), // <= 90 chars
  priority: text("priority").$type<"standard"|"featured">().default("standard"),
  
  // G) Budget & billing controls
  feeModel: text("fee_model").$type<"default"|"per_redemption"|"percent_discount">().default("default"),
  customFee: numeric("custom_fee", { precision: 10, scale: 2 }),
  budgetCap: numeric("budget_cap", { precision: 10, scale: 2 }),
  autoPauseOnAbuse: boolean("auto_pause_on_abuse").default(true),
  
  // H) Fraud & safety
  singleUse: boolean("single_use").default(true),
  deviceFingerprinting: boolean("device_fingerprinting").default(true),
  
  // Status and metadata
  active: boolean("active").default(true),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  discountType: text("discount_type").notNull(), // 'percentage', 'fixed', 'bogo', 'free_item'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  originalValue: decimal("original_value", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit").notNull(),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  expiryDate: timestamp("expiry_date").notNull(),
  terms: text("terms"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced redemptions table with comprehensive tracking
export const redemptions = pgTable("redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id),
  
  // Redemption details
  voucherCode: text("voucher_code"),
  basketValue: numeric("basket_value", { precision: 10, scale: 2 }),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }),
  finalValue: numeric("final_value", { precision: 10, scale: 2 }),
  
  // Staff and device tracking
  staffUserId: integer("staff_user_id"),
  deviceId: text("device_id"),
  stationId: text("station_id"),
  
  // Status and timing
  status: text("status").$type<"pending"|"completed"|"voided"|"refunded">().default("completed"),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  voidedAt: timestamp("voided_at"),
  refundedAt: timestamp("refunded_at"),
  
  // Location verification
  redemptionLatitude: numeric("redemption_latitude", { precision: 10, scale: 8 }),
  redemptionLongitude: numeric("redemption_longitude", { precision: 11, scale: 8 }),
  withinGeofence: boolean("within_geofence").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics tracking for offers
export const offerAnalytics = pgTable("offer_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  
  // Event tracking
  eventType: text("event_type").$type<"impression"|"view"|"save"|"redemption">().notNull(),
  sessionId: text("session_id"),
  deviceId: text("device_id"),
  
  // Context
  source: text("source"), // "home", "search", "category", "merchant_page"
  position: integer("position"), // Position in list/grid
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Blackout periods for offers
export const offerBlackouts = pgTable("offer_blackouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Graduation Week", "Christmas Period"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  recurring: boolean("recurring").default(false), // Annual recurrence
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  userId: integer("user_id").notNull(),
  voucherNumber: text("voucher_number").notNull().unique(),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  surname: true,
  role: true,
  postcode: true,
  businessName: true,
  businessCategory: true,
  businessAddress: true,
  businessPhone: true,
  profilePhoto: true,
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).pick({
  firstName: true,
  surname: true,
  age: true,
  relationship: true,
});

// Schema for legacy deals (backward compatibility)
export const insertDealSchema = createInsertSchema(deals).pick({
  title: true,
  description: true,
  category: true,
  discountType: true,
  discountValue: true,
  originalValue: true,
  usageLimit: true,
  expiryDate: true,
  terms: true,
  imageUrl: true,
});

// Schema for new comprehensive offers
export const insertOfferSchema = createInsertSchema(offers).pick({
  title: true,
  description: true,
  type: true,
  percentOff: true,
  fixedPrice: true,
  originalValue: true,
  category: true,
  audience: true,
  stackable: true,
  newCustomerOnly: true,
  geofenceRadius: true,
  validFrom: true,
  validTo: true,
  leadTime: true,
  maxPerTransaction: true,
  maxPerDay: true,
  maxPerWeek: true,
  maxLifetime: true,
  globalUsageLimit: true,
  staffPinRequired: true,
  proofType: true,
  refundBehavior: true,
  terms: true,
  dineInOnly: true,
  excludesAlcohol: true,
  serviceChargeIncluded: true,
  validOnBankHolidays: true,
  imageUrl: true,
  shortPromo: true,
  priority: true,
  feeModel: true,
  customFee: true,
  budgetCap: true,
  autoPauseOnAbuse: true,
  singleUse: true,
  deviceFingerprinting: true,
}).extend({
  // Override fields that need special handling for arrays/objects from frontend
  tags: z.array(z.string()).optional(),
  daysOfWeek: z.array(z.string()).optional(),
  timeSlots: z.record(z.array(z.object({
    start: z.string(),
    end: z.string()
  }))).optional(),
  blackoutDates: z.array(z.object({
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    recurring: z.boolean().default(false)
  })).optional(),
  mealPeriods: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  minBasket: z.number().optional(),
  maxDiscount: z.number().optional(),
  // Override date fields to accept strings from frontend
  validFrom: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  validTo: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  // Override type field to use new enum values
  type: z.enum(["percentage_discount", "fixed_amount_discount", "fixed_price_bundle", "free_item_with_purchase", "bogo", "day_time_specific", "limited_redemptions", "loyalty_reward"]),
});

export const insertEnhancedRedemptionSchema = createInsertSchema(redemptions).pick({
  offerId: true,
  userId: true,
  voucherCode: true,
  basketValue: true,
  discountValue: true,
  finalValue: true,
  staffUserId: true,
  deviceId: true,
  stationId: true,
  redemptionLatitude: true,
  redemptionLongitude: true,
});

export const insertBlackoutSchema = createInsertSchema(offerBlackouts).pick({
  offerId: true,
  name: true,
  startDate: true,
  endDate: true,
  recurring: true,
});

export const insertMerchantSchema = createInsertSchema(merchants).pick({
  name: true,
  email: true,
  phone: true,
  address: true,
  logoUrl: true,
  businessHours: true,
  reservationProvider: true,
  reservationUrl: true,
});

export const insertBillingRunSchema = createInsertSchema(billingRuns).pick({
  merchantId: true,
  periodStart: true,
  periodEnd: true,
  redemptionCount: true,
  feeType: true,
  feeValue: true,
  totalFees: true,
  status: true,
});

export const insertVoucherSchema = createInsertSchema(vouchers).pick({
  dealId: true,
  userId: true,
  voucherNumber: true,
  expiresAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;
export type InsertEnhancedRedemption = z.infer<typeof insertEnhancedRedemptionSchema>;
export type InsertRedemption = InsertEnhancedRedemption;
export type Redemption = typeof redemptions.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Voucher = typeof vouchers.$inferSelect;
export type InsertBillingRun = z.infer<typeof insertBillingRunSchema>;
export type BillingRun = typeof billingRuns.$inferSelect;

// Utility function for generating customer aliases in merchant views
export function generateCustomerAlias(user: { id: number; username?: string | null }): string {
  if (user.username) {
    return user.username;
  }
  // Generate safe alias based on user ID
  const hash = user.id.toString(16).padStart(6, '0');
  return `user_${hash}`;
}

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  deals: many(deals),
  redemptions: many(redemptions),
  vouchers: many(vouchers),
  familyMembers: many(familyMembers),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [offers.merchantId],
    references: [merchants.id],
  }),
  redemptions: many(redemptions),
  analytics: many(offerAnalytics),
  blackouts: many(offerBlackouts),
}));

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  offer: one(offers, {
    fields: [redemptions.offerId],
    references: [offers.id],
  }),
  user: one(users, {
    fields: [redemptions.userId],
    references: [users.id],
  }),
  merchant: one(merchants, {
    fields: [redemptions.merchantId],
    references: [merchants.id],
  }),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  merchant: one(users, {
    fields: [deals.merchantId],
    references: [users.id],
  }),
  vouchers: many(vouchers),
}));

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  deal: one(deals, {
    fields: [vouchers.dealId],
    references: [deals.id],
  }),
  user: one(users, {
    fields: [vouchers.userId],
    references: [users.id],
  }),
}));

export type DealWithMerchant = Deal & {
  merchantName: string;
  merchantAddress: string;
};

export type VoucherWithDeal = Voucher & {
  dealTitle: string;
  merchantName: string;
  discountValue: string;
  discountType: string;
};

export type UserRole = 'resident' | 'merchant' | 'admin';

export type SubscriptionType = 'individual' | 'family';

// Loyalty Program Tables  
export const loyaltyPrograms = pgTable("loyalty_programs", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").notNull(),
  model: text("model").$type<"points"|"stamps">().default("points"),
  pointsPerCurrency: integer("points_per_currency").default(10), // e.g. 10 points per £1
  minBasketEarn: text("min_basket_earn").default("0.00"),
  earnCooldownMinutes: integer("earn_cooldown_minutes").default(30),
  dailyEarnCap: integer("daily_earn_cap").default(3), // per user per day
  stackingAllowed: boolean("stacking_allowed").default(false),
  expiryDays: integer("expiry_days"), // rewards expiry, optional
  createdAt: timestamp("created_at").defaultNow(),
  active: boolean("active").default(true),
});

export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Bronze, Silver, Gold
  thresholdPoints: integer("threshold_points").notNull(), // or stamps
  rollingDays: integer("rolling_days").default(90), // 90-day rolling window
  perks: jsonb("perks"), // [{type:"percentOff", value:10, note:"Mon–Thu"}]
  sortOrder: integer("sort_order").default(0),
});

export const loyaltyBalances = pgTable("loyalty_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").default(0),
  stamps: integer("stamps").default(0),
  tierId: uuid("tier_id").references(() => loyaltyTiers.id), // current tier
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loyaltyEvents = pgTable("loyalty_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  programId: uuid("program_id").notNull().references(() => loyaltyPrograms.id),
  type: text("type").$type<"earn_points"|"earn_stamp"|"redeem_reward"|"adjust"|"tier_change">().notNull(),
  amount: integer("amount"), // points or stamps change (+/-)
  metadata: jsonb("metadata"), // {basket, staffUserId, deviceId, source:"qr|pin"}
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., Free Coffee
  costPoints: integer("cost_points"), // for points model
  costStamps: integer("cost_stamps"), // for stamps model
  terms: text("terms"),
  active: boolean("active").default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for loyalty system
export const loyaltyProgramRelations = relations(loyaltyPrograms, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [loyaltyPrograms.merchantId],
    references: [merchants.id]
  }),
  tiers: many(loyaltyTiers),
  rewards: many(loyaltyRewards),
  events: many(loyaltyEvents),
  balances: many(loyaltyBalances),
}));

export const loyaltyTierRelations = relations(loyaltyTiers, ({ one, many }) => ({
  program: one(loyaltyPrograms, {
    fields: [loyaltyTiers.programId],
    references: [loyaltyPrograms.id]
  }),
  balances: many(loyaltyBalances),
}));

export const loyaltyBalanceRelations = relations(loyaltyBalances, ({ one }) => ({
  merchant: one(merchants, {
    fields: [loyaltyBalances.merchantId],
    references: [merchants.id]
  }),
  user: one(users, {
    fields: [loyaltyBalances.userId],
    references: [users.id]
  }),
  tier: one(loyaltyTiers, {
    fields: [loyaltyBalances.tierId],
    references: [loyaltyTiers.id]
  }),
}));

export const loyaltyEventRelations = relations(loyaltyEvents, ({ one }) => ({
  merchant: one(merchants, {
    fields: [loyaltyEvents.merchantId],
    references: [merchants.id]
  }),
  user: one(users, {
    fields: [loyaltyEvents.userId],
    references: [users.id]
  }),
  program: one(loyaltyPrograms, {
    fields: [loyaltyEvents.programId],
    references: [loyaltyPrograms.id]
  }),
}));

export const loyaltyRewardRelations = relations(loyaltyRewards, ({ one }) => ({
  program: one(loyaltyPrograms, {
    fields: [loyaltyRewards.programId],
    references: [loyaltyPrograms.id]
  }),
}));

// Loyalty types
export type LoyaltyProgram = typeof loyaltyPrograms.$inferSelect;
export type InsertLoyaltyProgram = typeof loyaltyPrograms.$inferInsert;
export type LoyaltyTier = typeof loyaltyTiers.$inferSelect;
export type InsertLoyaltyTier = typeof loyaltyTiers.$inferInsert;
export type LoyaltyBalance = typeof loyaltyBalances.$inferSelect;
export type InsertLoyaltyBalance = typeof loyaltyBalances.$inferInsert;
export type LoyaltyEvent = typeof loyaltyEvents.$inferSelect;
export type InsertLoyaltyEvent = typeof loyaltyEvents.$inferInsert;
export type LoyaltyReward = typeof loyaltyRewards.$inferSelect;
export type InsertLoyaltyReward = typeof loyaltyRewards.$inferInsert;

// Loyalty schemas
export const insertLoyaltyProgramSchema = createInsertSchema(loyaltyPrograms);
export const insertLoyaltyTierSchema = createInsertSchema(loyaltyTiers);
export const insertLoyaltyBalanceSchema = createInsertSchema(loyaltyBalances);
export const insertLoyaltyEventSchema = createInsertSchema(loyaltyEvents);
export const insertLoyaltyRewardSchema = createInsertSchema(loyaltyRewards);
export type SubscriptionPlan = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled';
