import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'resident', 'merchant', 'admin'
  isVerified: boolean("is_verified").default(false),
  postcode: text("postcode"),
  businessName: text("business_name"),
  businessCategory: text("business_category"),
  businessAddress: text("business_address"),
  businessPhone: text("business_phone"),
  subscriptionType: text("subscription_type"), // 'individual' or 'family'
  subscriptionPlan: text("subscription_plan"), // 'monthly' or 'annual'
  subscriptionStatus: text("subscription_status").default("inactive"), // 'active', 'inactive', 'cancelled'
  membershipExpiry: timestamp("membership_expiry"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
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
  role: true,
  postcode: true,
  businessName: true,
  businessCategory: true,
  businessAddress: true,
  businessPhone: true,
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
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  merchant: one(users, {
    fields: [deals.merchantId],
    references: [users.id],
  }),
  redemptions: many(redemptions),
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

export type DealWithMerchant = Deal & {
  merchantName: string;
  merchantAddress: string;
};

export type UserRole = 'resident' | 'merchant' | 'admin';
