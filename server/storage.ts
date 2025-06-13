import { users, deals, redemptions, vouchers, type User, type InsertUser, type Deal, type InsertDeal, type Redemption, type InsertRedemption, type Voucher, type InsertVoucher, type DealWithMerchant, type VoucherWithDeal } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  updateUserProfile(id: number, updates: { username?: string; email?: string; profilePhoto?: string }): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getPendingBusinesses(): Promise<User[]>;
  verifyBusiness(id: number): Promise<User | undefined>;
  rejectBusiness(id: number): Promise<boolean>;
  
  // Deal operations
  getDeal(id: number): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal & { merchantId: number }): Promise<Deal>;
  updateDeal(id: number, updates: Partial<Deal>): Promise<Deal | undefined>;
  deleteDeal(id: number): Promise<boolean>;
  getDealsByMerchant(merchantId: number): Promise<Deal[]>;
  getActiveDeals(): Promise<DealWithMerchant[]>;
  getDealsByCategory(category: string): Promise<DealWithMerchant[]>;
  
  // Redemption operations
  createRedemption(redemption: InsertRedemption): Promise<Redemption>;
  getRedemptionsByUser(userId: number): Promise<Redemption[]>;
  getRedemptionsByDeal(dealId: number): Promise<Redemption[]>;
  getRedemptionsByMerchant(merchantId: number): Promise<Redemption[]>;
  
  // Voucher operations
  createVoucher(voucher: InsertVoucher): Promise<Voucher>;
  getVouchersByUser(userId: number): Promise<VoucherWithDeal[]>;
  getVoucherByNumber(voucherNumber: string): Promise<Voucher | undefined>;
  useVoucher(voucherNumber: string): Promise<Voucher | undefined>;
  getActiveVouchersCount(dealId: number): Promise<number>;
  
  // Subscription operations
  updateUserSubscription(userId: number, subscriptionData: {
    subscriptionType: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    membershipExpiry: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }): Promise<User | undefined>;
  
  // Analytics
  getDealStats(dealId: number): Promise<{ totalRedemptions: number; totalValue: number }>;
  getMerchantRevenue(merchantId: number): Promise<number>;
  getPlatformStats(): Promise<{
    totalUsers: number;
    totalBusinesses: number;
    totalDeals: number;
    totalRedemptions: number;
    totalRevenue: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private deals: Map<number, Deal>;
  private redemptions: Map<number, Redemption>;
  private currentUserId: number;
  private currentDealId: number;
  private currentRedemptionId: number;

  constructor() {
    this.users = new Map();
    this.deals = new Map();
    this.redemptions = new Map();
    this.currentUserId = 1;
    this.currentDealId = 1;
    this.currentRedemptionId = 1;
    
    // Create default admin user
    this.createUser({
      username: 'admin',
      email: 'admin@localperks.com',
      password: '$2b$10$hash', // In real app, this would be properly hashed
      role: 'admin',
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password,
      role: insertUser.role,
      isVerified: insertUser.role === 'resident' ? true : false, // Auto-verify residents
      postcode: insertUser.postcode || null,
      businessName: insertUser.businessName || null,
      businessCategory: insertUser.businessCategory || null,
      businessAddress: insertUser.businessAddress || null,
      businessPhone: insertUser.businessPhone || null,
      profilePhoto: null,
      subscriptionType: null,
      subscriptionPlan: null,
      subscriptionStatus: "inactive",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      membershipExpiry: insertUser.role === 'resident' 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        : null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserProfile(id: number, updates: { username?: string; email?: string; profilePhoto?: string }): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  async getPendingBusinesses(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => 
      user.role === 'merchant' && !user.isVerified
    );
  }

  async verifyBusiness(id: number): Promise<User | undefined> {
    return this.updateUser(id, { isVerified: true });
  }

  async rejectBusiness(id: number): Promise<boolean> {
    const user = this.users.get(id);
    if (user && user.role === 'merchant' && !user.isVerified) {
      this.users.delete(id);
      return true;
    }
    return false;
  }

  async getDeal(id: number): Promise<Deal | undefined> {
    return this.deals.get(id);
  }

  async createDeal(dealData: InsertDeal & { merchantId: number }): Promise<Deal> {
    const id = this.currentDealId++;
    const deal: Deal = {
      id,
      merchantId: dealData.merchantId,
      title: dealData.title,
      description: dealData.description,
      category: dealData.category,
      discountType: dealData.discountType,
      discountValue: dealData.discountValue || null,
      originalValue: dealData.originalValue || null,
      usageLimit: dealData.usageLimit,
      usageCount: 0,
      isActive: true,
      expiryDate: dealData.expiryDate,
      terms: dealData.terms || null,
      imageUrl: null,
      createdAt: new Date(),
    };
    this.deals.set(id, deal);
    return deal;
  }

  async updateDeal(id: number, updates: Partial<Deal>): Promise<Deal | undefined> {
    const deal = this.deals.get(id);
    if (!deal) return undefined;
    
    const updatedDeal = { ...deal, ...updates };
    this.deals.set(id, updatedDeal);
    return updatedDeal;
  }

  async deleteDeal(id: number): Promise<boolean> {
    return this.deals.delete(id);
  }

  async getDealsByMerchant(merchantId: number): Promise<Deal[]> {
    return Array.from(this.deals.values()).filter(deal => deal.merchantId === merchantId);
  }

  async getActiveDeals(): Promise<DealWithMerchant[]> {
    const activeDeals = Array.from(this.deals.values()).filter(deal => 
      deal.isActive && new Date(deal.expiryDate) > new Date()
    );
    
    return activeDeals.map(deal => {
      const merchant = this.users.get(deal.merchantId);
      return {
        ...deal,
        merchantName: merchant?.businessName || merchant?.username || 'Unknown',
        merchantAddress: merchant?.businessAddress || 'Address not provided',
      };
    });
  }

  async getDealsByCategory(category: string): Promise<DealWithMerchant[]> {
    const deals = await this.getActiveDeals();
    return deals.filter(deal => deal.category === category);
  }

  async createRedemption(redemption: InsertRedemption): Promise<Redemption> {
    const id = this.currentRedemptionId++;
    const newRedemption: Redemption = {
      id,
      dealId: redemption.dealId,
      userId: redemption.userId,
      value: redemption.value || null,
      redeemedAt: new Date(),
    };
    
    // Update deal usage count
    const deal = this.deals.get(redemption.dealId);
    if (deal) {
      deal.usageCount = (deal.usageCount || 0) + 1;
      this.deals.set(deal.id, deal);
    }
    
    this.redemptions.set(id, newRedemption);
    return newRedemption;
  }

  async getRedemptionsByUser(userId: number): Promise<Redemption[]> {
    return Array.from(this.redemptions.values()).filter(r => r.userId === userId);
  }

  async getRedemptionsByDeal(dealId: number): Promise<Redemption[]> {
    return Array.from(this.redemptions.values()).filter(r => r.dealId === dealId);
  }

  async getRedemptionsByMerchant(merchantId: number): Promise<Redemption[]> {
    const merchantDeals = await this.getDealsByMerchant(merchantId);
    const dealIds = merchantDeals.map(deal => deal.id);
    return Array.from(this.redemptions.values()).filter(r => dealIds.includes(r.dealId));
  }

  async getDealStats(dealId: number): Promise<{ totalRedemptions: number; totalValue: number }> {
    const redemptions = await this.getRedemptionsByDeal(dealId);
    return {
      totalRedemptions: redemptions.length,
      totalValue: redemptions.reduce((sum, r) => sum + Number(r.value || 0), 0),
    };
  }

  async getMerchantRevenue(merchantId: number): Promise<number> {
    const redemptions = await this.getRedemptionsByMerchant(merchantId);
    return redemptions.reduce((sum, r) => sum + Number(r.value || 0), 0) * 0.12; // 12% commission
  }

  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalBusinesses: number;
    totalDeals: number;
    totalRedemptions: number;
    totalRevenue: number;
  }> {
    const residents = await this.getUsersByRole('resident');
    const businesses = await this.getUsersByRole('merchant');
    const allRedemptions = Array.from(this.redemptions.values());
    const totalRevenue = allRedemptions.reduce((sum, r) => sum + Number(r.value || 0), 0) * 0.12;

    return {
      totalUsers: residents.length,
      totalBusinesses: businesses.filter(b => b.isVerified).length,
      totalDeals: Array.from(this.deals.values()).filter(d => d.isActive).length,
      totalRedemptions: allRedemptions.length,
      totalRevenue,
    };
  }
}

// rewrite MemStorage to DatabaseStorage
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserProfile(id: number, updates: { username?: string; email?: string; profilePhoto?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getPendingBusinesses(): Promise<User[]> {
    return await db.select().from(users).where(
      sql`${users.role} = 'merchant' AND ${users.isVerified} = false`
    );
  }

  async verifyBusiness(id: number): Promise<User | undefined> {
    return this.updateUser(id, { isVerified: true });
  }

  async rejectBusiness(id: number): Promise<boolean> {
    const result = await db.delete(users).where(
      sql`${users.id} = ${id} AND ${users.role} = 'merchant' AND ${users.isVerified} = false`
    );
    return (result.rowCount || 0) > 0;
  }

  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }

  async createDeal(dealData: InsertDeal & { merchantId: number }): Promise<Deal> {
    const [deal] = await db
      .insert(deals)
      .values(dealData)
      .returning();
    return deal;
  }

  async updateDeal(id: number, updates: Partial<Deal>): Promise<Deal | undefined> {
    const [deal] = await db
      .update(deals)
      .set(updates)
      .where(eq(deals.id, id))
      .returning();
    return deal || undefined;
  }

  async deleteDeal(id: number): Promise<boolean> {
    const result = await db.delete(deals).where(eq(deals.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getDealsByMerchant(merchantId: number): Promise<Deal[]> {
    return await db.select().from(deals).where(eq(deals.merchantId, merchantId));
  }

  async getActiveDeals(): Promise<DealWithMerchant[]> {
    const result = await db
      .select({
        id: deals.id,
        merchantId: deals.merchantId,
        title: deals.title,
        description: deals.description,
        category: deals.category,
        discountType: deals.discountType,
        discountValue: deals.discountValue,
        originalValue: deals.originalValue,
        usageLimit: deals.usageLimit,
        usageCount: deals.usageCount,
        expiryDate: deals.expiryDate,
        isActive: deals.isActive,
        terms: deals.terms,
        imageUrl: deals.imageUrl,
        createdAt: deals.createdAt,
        merchantName: users.businessName,
        merchantAddress: users.businessAddress,
      })
      .from(deals)
      .innerJoin(users, eq(deals.merchantId, users.id))
      .where(sql`${deals.isActive} = true AND ${deals.expiryDate} > NOW()`);

    return result.map(row => ({
      ...row,
      merchantName: row.merchantName || '',
      merchantAddress: row.merchantAddress || '',
    }));
  }

  async getDealsByCategory(category: string): Promise<DealWithMerchant[]> {
    const result = await db
      .select({
        id: deals.id,
        merchantId: deals.merchantId,
        title: deals.title,
        description: deals.description,
        category: deals.category,
        discountType: deals.discountType,
        discountValue: deals.discountValue,
        originalValue: deals.originalValue,
        usageLimit: deals.usageLimit,
        usageCount: deals.usageCount,
        expiryDate: deals.expiryDate,
        isActive: deals.isActive,
        terms: deals.terms,
        imageUrl: deals.imageUrl,
        createdAt: deals.createdAt,
        merchantName: users.businessName,
        merchantAddress: users.businessAddress,
      })
      .from(deals)
      .innerJoin(users, eq(deals.merchantId, users.id))
      .where(sql`${deals.category} = ${category} AND ${deals.isActive} = true`);

    return result.map(row => ({
      ...row,
      merchantName: row.merchantName || '',
      merchantAddress: row.merchantAddress || '',
    }));
  }

  async createRedemption(redemption: InsertRedemption): Promise<Redemption> {
    const [newRedemption] = await db
      .insert(redemptions)
      .values(redemption)
      .returning();
    return newRedemption;
  }

  async getRedemptionsByUser(userId: number): Promise<Redemption[]> {
    return await db.select().from(redemptions).where(eq(redemptions.userId, userId));
  }

  async getRedemptionsByDeal(dealId: number): Promise<Redemption[]> {
    return await db.select().from(redemptions).where(eq(redemptions.dealId, dealId));
  }

  async getRedemptionsByMerchant(merchantId: number): Promise<Redemption[]> {
    const result = await db
      .select()
      .from(redemptions)
      .innerJoin(deals, eq(redemptions.dealId, deals.id))
      .where(eq(deals.merchantId, merchantId));
    
    return result.map(row => row.redemptions);
  }

  async getDealStats(dealId: number): Promise<{ totalRedemptions: number; totalValue: number }> {
    const redemptionsList = await this.getRedemptionsByDeal(dealId);
    const totalRedemptions = redemptionsList.length;
    const totalValue = redemptionsList.reduce((sum, r) => sum + Number(r.value || 0), 0);
    return { totalRedemptions, totalValue };
  }

  async getMerchantRevenue(merchantId: number): Promise<number> {
    const redemptionsList = await this.getRedemptionsByMerchant(merchantId);
    return redemptionsList.reduce((sum, r) => sum + Number(r.value || 0), 0);
  }

  async createVoucher(voucher: InsertVoucher): Promise<Voucher> {
    const [newVoucher] = await db
      .insert(vouchers)
      .values(voucher)
      .returning();
    return newVoucher;
  }

  async getVouchersByUser(userId: number): Promise<VoucherWithDeal[]> {
    const result = await db
      .select({
        id: vouchers.id,
        dealId: vouchers.dealId,
        userId: vouchers.userId,
        voucherNumber: vouchers.voucherNumber,
        isUsed: vouchers.isUsed,
        usedAt: vouchers.usedAt,
        expiresAt: vouchers.expiresAt,
        createdAt: vouchers.createdAt,
        dealTitle: deals.title,
        merchantName: users.businessName,
        discountValue: deals.discountValue,
        discountType: deals.discountType,
      })
      .from(vouchers)
      .innerJoin(deals, eq(vouchers.dealId, deals.id))
      .innerJoin(users, eq(deals.merchantId, users.id))
      .where(eq(vouchers.userId, userId));

    return result.map(row => ({
      ...row,
      merchantName: row.merchantName || '',
      discountValue: row.discountValue || '0',
    }));
  }

  async getVoucherByNumber(voucherNumber: string): Promise<Voucher | undefined> {
    const [voucher] = await db.select().from(vouchers).where(eq(vouchers.voucherNumber, voucherNumber));
    return voucher || undefined;
  }

  async useVoucher(voucherNumber: string): Promise<Voucher | undefined> {
    const [voucher] = await db
      .update(vouchers)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(vouchers.voucherNumber, voucherNumber))
      .returning();
    return voucher || undefined;
  }

  async getActiveVouchersCount(dealId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql`COUNT(*)` })
      .from(vouchers)
      .where(sql`${vouchers.dealId} = ${dealId} AND ${vouchers.isUsed} = false AND ${vouchers.expiresAt} > NOW()`);
    return Number(result.count);
  }

  async updateUserSubscription(userId: number, subscriptionData: {
    subscriptionType: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    membershipExpiry: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(subscriptionData)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalBusinesses: number;
    totalDeals: number;
    totalRedemptions: number;
    totalRevenue: number;
  }> {
    const [usersCount] = await db.select({ count: sql`COUNT(*)` }).from(users);
    const [businessesCount] = await db.select({ count: sql`COUNT(*)` }).from(users).where(eq(users.role, 'merchant'));
    const [dealsCount] = await db.select({ count: sql`COUNT(*)` }).from(deals);
    const [redemptionsCount] = await db.select({ count: sql`COUNT(*)` }).from(redemptions);
    
    const allRedemptions = await db.select().from(redemptions);
    const totalRevenue = allRedemptions.reduce((sum, r) => sum + Number(r.value || 0), 0);

    return {
      totalUsers: Number(usersCount.count),
      totalBusinesses: Number(businessesCount.count),
      totalDeals: Number(dealsCount.count),
      totalRedemptions: Number(redemptionsCount.count),
      totalRevenue,
    };
  }
}

export const storage = new DatabaseStorage();
