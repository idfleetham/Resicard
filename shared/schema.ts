import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
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

export const redemptions = pgTable("redemptions", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  userId: integer("user_id").notNull(),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  value: decimal("value", { precision: 10, scale: 2 }),
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
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).pick({
  firstName: true,
  surname: true,
  age: true,
  relationship: true,
});

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

export const insertRedemptionSchema = createInsertSchema(redemptions).pick({
  dealId: true,
  userId: true,
  value: true,
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
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;
export type Redemption = typeof redemptions.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Voucher = typeof vouchers.$inferSelect;

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

export const dealsRelations = relations(deals, ({ one, many }) => ({
  merchant: one(users, {
    fields: [deals.merchantId],
    references: [users.id],
  }),
  redemptions: many(redemptions),
  vouchers: many(vouchers),
}));

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  user: one(users, {
    fields: [redemptions.userId],
    references: [users.id],
  }),
  deal: one(deals, {
    fields: [redemptions.dealId],
    references: [deals.id],
  }),
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
export type SubscriptionPlan = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled';
