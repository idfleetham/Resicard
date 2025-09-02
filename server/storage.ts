import { users, redemptions, vouchers, familyMembers, offers, merchants, loyaltyPrograms, loyaltyBalances, loyaltyEvents, loyaltyTiers, loyaltyRewards, type User, type InsertUser, type Redemption, type InsertRedemption, type Voucher, type InsertVoucher, type FamilyMember, type InsertFamilyMember, type Offer, type InsertOffer, type Merchant, type InsertMerchant, type LoyaltyProgram, type InsertLoyaltyProgram, type LoyaltyBalance, type InsertLoyaltyBalance, type LoyaltyEvent, type InsertLoyaltyEvent, type LoyaltyReward, type InsertLoyaltyReward } from "@shared/schema";

// Legacy Deal types mapped to Offer types
type Deal = Offer;
type InsertDeal = InsertOffer;
type DealWithMerchant = Offer & { merchant: Merchant };
type VoucherWithDeal = Voucher;
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  updateUserProfile(id: number, updates: { username?: string; email?: string; profilePhoto?: string }): Promise<User | undefined>;
  updateUserBusinessDetails(id: number, updates: { businessName?: string; businessPhone?: string; businessAddress?: string; email?: string }): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getPendingBusinesses(): Promise<User[]>;
  verifyBusiness(id: number): Promise<User | undefined>;
  rejectBusiness(id: number): Promise<boolean>;
  
  // Document verification operations
  submitDocument(userId: number, documentData: {
    documentType: string;
    documentFile: string;
  }): Promise<User | undefined>;
  getPendingDocuments(): Promise<User[]>;
  approveDocument(userId: number, reviewerId: number): Promise<User | undefined>;
  rejectDocument(userId: number, reviewerId: number): Promise<User | undefined>;
  
  // Deal operations (mapped to Offer operations)
  getDeal(id: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal & { merchantId: string }): Promise<Deal>;
  updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | undefined>;
  deleteDeal(id: string): Promise<boolean>;
  getDealsByMerchant(merchantId: string): Promise<Deal[]>;
  getActiveDeals(): Promise<DealWithMerchant[]>;
  getDealsByCategory(category: string): Promise<DealWithMerchant[]>;
  
  // Comprehensive Offer operations
  createOffer(offer: InsertOffer): Promise<Offer>;
  getOffer(id: string): Promise<Offer | undefined>;
  getOffersByMerchant(merchantId: string): Promise<Offer[]>;
  updateOffer(id: string, updates: Partial<Offer>): Promise<Offer | undefined>;
  deleteOffer(id: string): Promise<boolean>;
  
  // Merchant operations
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  getMerchant(id: string): Promise<Merchant | undefined>;
  updateMerchant(id: string, updates: Partial<Merchant>): Promise<Merchant | undefined>;
  
  // Redemption operations
  createRedemption(redemption: InsertRedemption): Promise<Redemption>;
  getRedemptionsByUser(userId: number): Promise<Redemption[]>;
  getRedemptionsByDeal(dealId: number): Promise<Redemption[]>;
  getRedemptionsByMerchant(merchantId: number): Promise<Redemption[]>;
  
  // Voucher operations
  createVoucher(voucher: InsertVoucher): Promise<Voucher>;
  getVouchersByUser(userId: number): Promise<VoucherWithDeal[]>;
  getVoucherByNumber(voucherNumber: string): Promise<Voucher | undefined>;
  getVoucherById(voucherId: number): Promise<Voucher | undefined>;
  useVoucher(voucherNumber: string): Promise<Voucher | undefined>;
  deleteVoucher(voucherId: number, userId: number): Promise<boolean>;
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
  
  // Family member operations
  createFamilyMembers(userId: number, familyMembers: InsertFamilyMember[]): Promise<FamilyMember[]>;
  getFamilyMembersByUser(userId: number): Promise<FamilyMember[]>;
  
  // Loyalty Program operations
  getLoyaltyProgram(merchantId: number): Promise<LoyaltyProgram | undefined>;
  createLoyaltyProgram(program: InsertLoyaltyProgram): Promise<LoyaltyProgram>;
  updateLoyaltyProgram(merchantId: number, updates: Partial<LoyaltyProgram>): Promise<LoyaltyProgram | undefined>;
  
  // Loyalty Members operations
  getLoyaltyMembers(merchantId: number): Promise<any[]>;
  awardLoyaltyPoints(merchantId: number, userId: number, points: number, reason: string): Promise<any>;
  collectPointsFromTransaction(merchantId: number, userId: number, basketAmount: number): Promise<any>;
  updateMemberTier(merchantId: number, userId: number, tierId: string, reason: string): Promise<any>;
  
  // Loyalty Rewards operations
  createLoyaltyReward(rewardData: InsertLoyaltyReward): Promise<LoyaltyReward>;

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
      firstName: insertUser.firstName || null,
      surname: insertUser.surname || null,
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
      // Document verification fields
      documentType: null,
      documentFile: null,
      documentStatus: null,
      documentSubmittedAt: null,
      documentReviewedAt: null,
      documentReviewedBy: null,
      isResidencyVerified: false,
      // Merchant portal fields
      merchantId: null,
      staffPin: null,
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

  async updateUserBusinessDetails(id: number, updates: { businessName?: string; businessPhone?: string; businessAddress?: string; email?: string }): Promise<User | undefined> {
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
      imageUrl: dealData.imageUrl || null,
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
    const redemptionId = `redemption_${this.currentRedemptionId++}`;
    const newRedemption: Redemption = {
      id: redemptionId,
      offerId: redemption.offerId,
      userId: redemption.userId,
      merchantId: '',  // Will be set properly in real implementation
      voucherCode: redemption.voucherCode || null,
      basketValue: redemption.basketValue || null,
      discountValue: redemption.discountValue || null,
      finalValue: redemption.finalValue || null,
      staffUserId: redemption.staffUserId || null,
      deviceId: redemption.deviceId || null,
      stationId: redemption.stationId || null,
      status: 'completed',
      redeemedAt: new Date(),
      voidedAt: null,
      refundedAt: null,
      redemptionLatitude: redemption.redemptionLatitude || null,
      redemptionLongitude: redemption.redemptionLongitude || null,
      withinGeofence: true,
      createdAt: new Date(),
    };
    
    this.redemptions.set(this.currentRedemptionId - 1, newRedemption);
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

  // Document verification methods
  async submitDocument(userId: number, documentData: { documentType: string; documentFile: string }): Promise<User | undefined> {
    return this.updateUser(userId, {
      documentType: documentData.documentType,
      documentFile: documentData.documentFile,
      documentStatus: 'pending',
      documentSubmittedAt: new Date(),
    });
  }

  async getPendingDocuments(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.documentStatus === 'pending');
  }

  async approveDocument(userId: number, reviewerId: number): Promise<User | undefined> {
    return this.updateUser(userId, {
      documentStatus: 'approved',
      documentReviewedAt: new Date(),
      documentReviewedBy: reviewerId,
      isResidencyVerified: true,
    });
  }

  async rejectDocument(userId: number, reviewerId: number): Promise<User | undefined> {
    return this.updateUser(userId, {
      documentStatus: 'rejected',
      documentReviewedAt: new Date(),
      documentReviewedBy: reviewerId,
    });
  }

  // Comprehensive Offer operations (stub implementations)
  async createOffer(offer: InsertOffer): Promise<Offer> {
    throw new Error('Offers not implemented in MemStorage');
  }

  async getOffer(id: string): Promise<Offer | undefined> {
    throw new Error('Offers not implemented in MemStorage');
  }

  async getOffersByMerchant(merchantId: number): Promise<Offer[]> {
    return [];
  }

  async updateOffer(id: string, updates: Partial<Offer>): Promise<Offer | undefined> {
    throw new Error('Offers not implemented in MemStorage');
  }

  async deleteOffer(id: string): Promise<boolean> {
    return false;
  }

  // Voucher operations (stub implementations)
  async createVoucher(voucher: InsertVoucher): Promise<Voucher> {
    throw new Error('Vouchers not implemented in MemStorage');
  }

  async getVouchersByUser(userId: number): Promise<VoucherWithDeal[]> {
    return [];
  }

  async getVoucherByNumber(voucherNumber: string): Promise<Voucher | undefined> {
    return undefined;
  }

  async getVoucherById(voucherId: number): Promise<Voucher | undefined> {
    return undefined;
  }

  async useVoucher(voucherNumber: string): Promise<Voucher | undefined> {
    return undefined;
  }

  async deleteVoucher(voucherId: number, userId: number): Promise<boolean> {
    return false;
  }

  async getActiveVouchersCount(dealId: number): Promise<number> {
    return 0;
  }

  // Subscription operations
  async updateUserSubscription(userId: number, subscriptionData: {
    subscriptionType: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    membershipExpiry: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }): Promise<User | undefined> {
    return this.updateUser(userId, subscriptionData);
  }

  // Family member operations (stub implementations)
  async createFamilyMembers(userId: number, familyMembers: InsertFamilyMember[]): Promise<FamilyMember[]> {
    return [];
  }

  async getFamilyMembersByUser(userId: number): Promise<FamilyMember[]> {
    return [];
  }

  // Loyalty Program operations (mock implementation)
  async getLoyaltyProgram(merchantId: number): Promise<LoyaltyProgram | undefined> {
    return undefined;
  }

  async createLoyaltyProgram(programData: InsertLoyaltyProgram): Promise<LoyaltyProgram> {
    throw new Error("Loyalty programs not supported in memory storage");
  }

  async updateLoyaltyProgram(merchantId: number, updates: Partial<LoyaltyProgram>): Promise<LoyaltyProgram | undefined> {
    return undefined;
  }

  async getLoyaltyMembers(merchantId: number): Promise<any[]> {
    return [];
  }

  async awardLoyaltyPoints(merchantId: number, userId: number, points: number, reason: string): Promise<any> {
    return { success: false, message: "Loyalty points not supported in memory storage" };
  }

  async collectPointsFromTransaction(merchantId: number, userId: number, basketAmount: number): Promise<any> {
    return { success: false, message: "Transaction points not supported in memory storage" };
  }

  async updateMemberTier(merchantId: number, userId: number, tierId: string, reason: string): Promise<any> {
    return { success: false, message: "Member tier updates not supported in memory storage" };
  }

  async createLoyaltyReward(rewardData: InsertLoyaltyReward): Promise<LoyaltyReward> {
    throw new Error("Loyalty rewards not supported in memory storage");
  }

  // Merchant-related methods
  async getMerchantByUserId(userId: number): Promise<Merchant | undefined> {
    // Stub implementation - in real app would have separate merchant table
    return undefined;
  }

  async createMerchantFromUser(user: any): Promise<Merchant> {
    // Stub implementation - creates a mock merchant record
    return {
      id: `merchant_${user.id}`,
      name: user.businessName || user.username || 'Unknown Business',
      email: user.email,
      phone: user.businessPhone || null,
      address: user.businessAddress || null,
      logoUrl: user.profilePhoto || null,
      businessHours: null,
      apiKey: null,
      reservationProvider: null,
      reservationUrl: null,
      createdAt: new Date(),
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

  async updateUserBusinessDetails(id: number, updates: { businessName?: string; businessPhone?: string; businessAddress?: string; email?: string }): Promise<User | undefined> {
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

  async getDeal(id: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(offers).where(eq(offers.id, id));
    return deal || undefined;
  }

  async createDeal(dealData: InsertDeal & { merchantId: string }): Promise<Deal> {
    const [deal] = await db
      .insert(offers)
      .values(dealData)
      .returning();
    return deal;
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | undefined> {
    const [deal] = await db
      .update(offers)
      .set(updates)
      .where(eq(offers.id, id))
      .returning();
    return deal || undefined;
  }

  async deleteDeal(id: string): Promise<boolean> {
    const result = await db.delete(offers).where(eq(offers.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getDealsByMerchant(merchantId: string): Promise<Deal[]> {
    return await db.select().from(offers).where(eq(offers.merchantId, merchantId));
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
        username: users.username,
      })
      .from(deals)
      .innerJoin(users, eq(deals.merchantId, users.id))
      .where(sql`${deals.isActive} = true AND ${deals.expiryDate} > NOW()`);

    return result.map(row => ({
      ...row,
      merchantName: row.merchantName || row.username || 'Unknown Business',
      merchantAddress: row.merchantAddress || 'Address not provided',
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
        username: users.username,
      })
      .from(deals)
      .innerJoin(users, eq(deals.merchantId, users.id))
      .where(sql`${deals.category} = ${category} AND ${deals.isActive} = true`);

    return result.map(row => ({
      ...row,
      merchantName: row.merchantName || row.username || 'Unknown Business',
      merchantAddress: row.merchantAddress || 'Address not provided',
    }));
  }

  async createRedemption(redemption: InsertRedemption): Promise<Redemption> {
    const [newRedemption] = await db
      .insert(redemptions)
      .values(redemption)
      .returning();
    return newRedemption;
  }

  // Legacy redemption creation for the existing database structure
  async createLegacyRedemption(redemption: { dealId: number; userId: number; value: number }): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO redemptions (deal_id, user_id, value, redeemed_at)
      VALUES (${redemption.dealId}, ${redemption.userId}, ${redemption.value}, NOW())
      RETURNING id, deal_id, user_id, value, redeemed_at
    `);
    return result.rows[0];
  }

  async getRedemptionsByUser(userId: number): Promise<Redemption[]> {
    return await db.select().from(redemptions).where(eq(redemptions.userId, userId));
  }

  async getRedemptionsByDeal(dealId: number): Promise<Redemption[]> {
    return await db.select().from(redemptions).where(eq(redemptions.dealId, dealId));
  }

  async getRedemptionsByMerchant(merchantId: number): Promise<Redemption[]> {
    // For now, return empty array since we need to restructure redemptions to work with offers
    // TODO: Implement proper merchant redemption lookup with offers table
    return [];
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
    
    // Increment the offer's usage count if dealId is not -1 (legacy offers use -1)
    if (voucher.dealId !== -1) {
      await db
        .update(offers)
        .set({ 
          usageCount: sql`${offers.usageCount} + 1`
        })
        .where(eq(offers.id, voucher.dealId.toString()));
    }
    
    return newVoucher;
  }

  async getVouchersByUser(userId: number): Promise<VoucherWithDeal[]> {
    try {
      // Get all vouchers for the user
      const allVouchers = await db
        .select()
        .from(vouchers)
        .where(eq(vouchers.userId, userId));

      const result: VoucherWithDeal[] = [];

      for (const voucher of allVouchers) {
        if (voucher.dealId === -1) {
          // This is a UUID offer voucher - extract deal info from voucherNumber
          // UUID pattern: 8-4-4-4-12 characters (e.g., 208783e2-cc55-42ce-9efc-a47d7eff7f1c)
          const uuidMatch = voucher.voucherNumber.match(/^([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})-/i);
          
          if (uuidMatch) {
            const offerId = uuidMatch[1].toLowerCase(); // Convert to lowercase to match database
            
            // Fetch offer details from the offers table
            const [offer] = await db
              .select({
                id: offers.id,
                title: offers.title,
                merchantId: offers.merchantId,
                percentOff: offers.percentOff,
                type: offers.type,
              })
              .from(offers)
              .where(eq(offers.id, offerId));

            if (offer) {
              // Get merchant info from merchants table using UUID
              const [merchant] = await db
                .select({ businessName: merchants.name })
                .from(merchants)
                .where(eq(merchants.id, offer.merchantId));

              result.push({
                ...voucher,
                dealTitle: offer.title,
                merchantName: merchant?.businessName || 'Unknown Merchant',
                discountValue: offer.percentOff?.toString() || '0',
                discountType: offer.type || 'percentage_discount',
              });
            }
          }
        } else {
        // This is a regular deal voucher - treat as legacy offer
        const [offer] = await db
          .select({
            id: offers.id,
            title: offers.title,
            merchantId: offers.merchantId,
            percentOff: offers.percentOff,
            type: offers.type,
          })
          .from(offers)
          .where(eq(offers.id, voucher.dealId.toString()));

        if (offer) {
          // Get merchant info from merchants table using UUID
          const [merchant] = await db
            .select({ businessName: merchants.name })
            .from(merchants)
            .where(eq(merchants.id, offer.merchantId));

          const dealVoucher = {
            id: voucher.id,
            dealId: voucher.dealId,
            userId: voucher.userId,
            voucherNumber: voucher.voucherNumber,
            isUsed: voucher.isUsed,
            usedAt: voucher.usedAt,
            expiresAt: voucher.expiresAt,
            createdAt: voucher.createdAt,
            dealTitle: offer.title,
            merchantName: merchant?.businessName || 'Unknown Merchant',
            discountValue: offer.percentOff?.toString() || '0',
            discountType: offer.type || 'percentage_discount',
          };

          result.push({
            ...dealVoucher,
            merchantName: dealVoucher.merchantName || '',
            discountValue: dealVoucher.discountValue || '0',
          });
        }
      }
    }

    return result;
    } catch (error) {
      console.error('Error in getVouchersByUser:', error);
      throw error;
    }
  }

  async getVoucherByNumber(voucherNumber: string): Promise<Voucher | undefined> {
    const [voucher] = await db.select().from(vouchers).where(eq(vouchers.voucherNumber, voucherNumber));
    return voucher || undefined;
  }

  async getVoucherById(voucherId: number): Promise<Voucher | undefined> {
    const [voucher] = await db.select().from(vouchers).where(eq(vouchers.id, voucherId));
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

  async deleteVoucher(voucherId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(vouchers)
      .where(
        and(
          eq(vouchers.id, voucherId),
          eq(vouchers.userId, userId) // Ensure user can only delete their own vouchers
        )
      );
    
    // Return true if a row was deleted
    return result.rowCount !== null && result.rowCount > 0;
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

  // Comprehensive Offer operations
  async createOffer(offerData: InsertOffer): Promise<Offer> {
    console.log('Storage: Received offer data with merchantId:', offerData.merchantId);
    
    // Convert merchantId to proper format and prepare data for database
    const processedData = {
      ...offerData,
      merchantId: offerData.merchantId ? String(offerData.merchantId) : undefined,
      tags: Array.isArray(offerData.tags) ? JSON.stringify(offerData.tags) : offerData.tags,
      eligibleTiers: Array.isArray(offerData.eligibleTiers) ? JSON.stringify(offerData.eligibleTiers) : offerData.eligibleTiers,
      daysOfWeek: Array.isArray(offerData.daysOfWeek) ? JSON.stringify(offerData.daysOfWeek) : offerData.daysOfWeek,
      timeSlots: typeof offerData.timeSlots === 'object' ? JSON.stringify(offerData.timeSlots) : offerData.timeSlots,
      blackoutDates: Array.isArray(offerData.blackoutDates) ? JSON.stringify(offerData.blackoutDates) : offerData.blackoutDates,
      locations: Array.isArray(offerData.locations) ? JSON.stringify(offerData.locations) : offerData.locations,
    };
    
    console.log('Storage: Processed data with merchantId:', processedData.merchantId);

    const [newOffer] = await db
      .insert(offers)
      .values(processedData)
      .returning();
    return newOffer;
  }

  async getOffer(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer || undefined;
  }

  async getOffersByMerchant(merchantId: string): Promise<Offer[]> {
    const result = await db.select().from(offers).where(eq(offers.merchantId, merchantId));
    console.log('Found offers for merchant', merchantId, ':', result.length);
    return result;
  }

  async updateOffer(id: string, updates: Partial<Offer>): Promise<Offer | undefined> {
    const processedUpdates = {
      ...updates,
      tags: Array.isArray(updates.tags) ? JSON.stringify(updates.tags) : updates.tags,
      eligibleTiers: Array.isArray(updates.eligibleTiers) ? JSON.stringify(updates.eligibleTiers) : updates.eligibleTiers,
      daysOfWeek: Array.isArray(updates.daysOfWeek) ? JSON.stringify(updates.daysOfWeek) : updates.daysOfWeek,
      timeSlots: typeof updates.timeSlots === 'object' ? JSON.stringify(updates.timeSlots) : updates.timeSlots,
      blackoutDates: Array.isArray(updates.blackoutDates) ? JSON.stringify(updates.blackoutDates) : updates.blackoutDates,
      locations: Array.isArray(updates.locations) ? JSON.stringify(updates.locations) : updates.locations,
      // Convert date strings to Date objects
      validFrom: updates.validFrom ? new Date(updates.validFrom) : updates.validFrom,
      validTo: updates.validTo ? new Date(updates.validTo) : updates.validTo,
      updatedAt: new Date(),
    };

    const [updatedOffer] = await db
      .update(offers)
      .set(processedUpdates)
      .where(eq(offers.id, id))
      .returning();
    return updatedOffer || undefined;
  }

  async deleteOffer(id: string): Promise<boolean> {
    const result = await db.delete(offers).where(eq(offers.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Merchant management methods
  async getMerchantByUserId(userId: number): Promise<Merchant | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // First try to match by business name
    if (user.businessName) {
      const [merchant] = await db.select().from(merchants).where(eq(merchants.name, user.businessName));
      if (merchant) return merchant;
    }
    
    // Then try to match by email
    if (user.email) {
      const [merchant] = await db.select().from(merchants).where(eq(merchants.email, user.email));
      if (merchant) return merchant;
    }
    
    // Finally try to match by username (fallback)
    const [merchant] = await db.select().from(merchants).where(eq(merchants.name, user.username));
    return merchant || undefined;
  }

  async createMerchantFromUser(user: User): Promise<Merchant> {
    const [newMerchant] = await db
      .insert(merchants)
      .values({
        name: user.businessName || user.username || 'Unknown Business',
        email: user.email || undefined,
        phone: user.businessPhone || undefined,
        address: user.businessAddress || undefined,
        logoUrl: user.profilePhoto || undefined,
      })
      .returning();
    return newMerchant;
  }

  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalBusinesses: number;
    totalDeals: number;
    totalRedemptions: number;
    totalRevenue: number;
  }> {
    const [usersCount] = await db.select({ count: sql`COUNT(*)` }).from(users).where(eq(users.role, 'resident'));
    const [businessesCount] = await db.select({ count: sql`COUNT(*)` }).from(users).where(eq(users.role, 'merchant'));
    const [dealsCount] = await db.select({ count: sql`COUNT(*)` }).from(offers);
    const [vouchersUsedCount] = await db.select({ count: sql`COUNT(*)` }).from(vouchers).where(eq(vouchers.isUsed, true));
    
    // TODO: Update revenue calculation to work with offers schema
    // Calculate total revenue from used vouchers with 5% commission
    // Temporarily disabled during migration
    let totalRevenue = 0;

    return {
      totalUsers: Number(usersCount.count),
      totalBusinesses: Number(businessesCount.count),
      totalDeals: Number(dealsCount.count),
      totalRedemptions: Number(vouchersUsedCount.count),
      totalRevenue,
    };
  }

  async submitDocument(userId: number, documentData: {
    documentType: string;
    documentFile: string;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        documentType: documentData.documentType,
        documentFile: documentData.documentFile,
        documentStatus: "pending",
        documentSubmittedAt: new Date(),
        isResidencyVerified: false,
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getPendingDocuments(): Promise<User[]> {
    return await db.select().from(users).where(
      sql`${users.documentStatus} = 'pending' AND ${users.role} = 'resident' AND ${users.documentType} IS NOT NULL AND ${users.documentFile} IS NOT NULL`
    );
  }

  async approveDocument(userId: number, reviewerId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        documentStatus: "approved",
        documentReviewedAt: new Date(),
        documentReviewedBy: reviewerId,
        isResidencyVerified: true,
        isVerified: true,
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async rejectDocument(userId: number, reviewerId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        documentStatus: "rejected",
        documentReviewedAt: new Date(),
        documentReviewedBy: reviewerId,
        isResidencyVerified: false,
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async createFamilyMembers(userId: number, familyMemberData: InsertFamilyMember[]): Promise<FamilyMember[]> {
    const membersToInsert = familyMemberData.map(member => ({
      ...member,
      userId,
    }));
    
    const result = await db
      .insert(familyMembers)
      .values(membersToInsert)
      .returning();
    
    return result;
  }

  async getFamilyMembersByUser(userId: number): Promise<FamilyMember[]> {
    return await db.select().from(familyMembers).where(eq(familyMembers.userId, userId));
  }

  // Loyalty Program operations
  async getLoyaltyProgram(merchantId: number): Promise<LoyaltyProgram | undefined> {
    const [program] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.merchantId, merchantId));
    return program || undefined;
  }

  async createLoyaltyProgram(programData: InsertLoyaltyProgram): Promise<LoyaltyProgram> {
    const [program] = await db
      .insert(loyaltyPrograms)
      .values(programData)
      .returning();
    return program;
  }

  async updateLoyaltyProgram(merchantId: number, updates: Partial<LoyaltyProgram>): Promise<LoyaltyProgram | undefined> {
    const [program] = await db
      .update(loyaltyPrograms)
      .set(updates)
      .where(eq(loyaltyPrograms.merchantId, merchantId))
      .returning();
    return program || undefined;
  }

  async getLoyaltyMembers(merchantId: number): Promise<any[]> {
    // Use raw SQL query to match actual table structure
    const result = await db.execute(sql`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name as "firstName",
        u.surname,
        lb.balance as points,
        0 as stamps,
        lb.tier as "tierId",
        lb.tier as "tierName",
        '#cd7f32' as "tierColor",
        lb.updated_at as "updatedAt"
      FROM loyalty_balances lb
      INNER JOIN users u ON lb.user_id = u.id
      WHERE lb.merchant_id = ${merchantId}
    `);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      firstName: row.firstName,
      surname: row.surname,
      points: row.points,
      stamps: row.stamps,
      tierId: row.tierId,
      tierName: row.tierName,
      tierColor: row.tierColor,
      updatedAt: row.updatedAt,
    }));
  }

  async awardLoyaltyPoints(merchantId: number, userId: number, points: number, reason: string): Promise<any> {
    return await db.transaction(async (tx) => {
      // Use raw SQL to work with actual table structure
      const existingResult = await tx.execute(sql`
        SELECT balance, tier FROM loyalty_balances 
        WHERE merchant_id = ${merchantId} AND user_id = ${userId}
      `);

      let newBalance: number;
      if (existingResult.rows.length === 0) {
        // Create new balance record
        newBalance = points;
        await tx.execute(sql`
          INSERT INTO loyalty_balances (user_id, merchant_id, balance, tier, created_at, updated_at)
          VALUES (${userId}, ${merchantId}, ${points}, 'bronze', NOW(), NOW())
        `);
      } else {
        // Update existing balance
        const currentBalance = Number(existingResult.rows[0].balance) || 0;
        newBalance = currentBalance + points;
        await tx.execute(sql`
          UPDATE loyalty_balances 
          SET balance = ${newBalance}, updated_at = NOW()
          WHERE merchant_id = ${merchantId} AND user_id = ${userId}
        `);
      }

      return { success: true, pointsAwarded: points, newBalance };
    });
  }

  async collectPointsFromTransaction(merchantId: number, userId: number, basketAmount: number): Promise<any> {
    return await db.transaction(async (tx) => {
      // Get loyalty program settings
      const [program] = await tx
        .select()
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.merchantId, merchantId));

      if (!program) {
        throw new Error("Loyalty program not found for merchant");
      }

      // Check minimum basket requirement
      const minBasket = parseFloat(program.minBasketEarn || "0");
      if (basketAmount < minBasket) {
        return { 
          success: false, 
          message: `Minimum spend of £${minBasket.toFixed(2)} required to earn points`,
          pointsEarned: 0
        };
      }

      // Calculate points based on programme settings
      const pointsPerCurrency = program.pointsPerCurrency || 10;
      const pointsEarned = Math.floor(basketAmount * pointsPerCurrency);

      // Get or create loyalty balance
      let [balance] = await tx
        .select()
        .from(loyaltyBalances)
        .where(and(eq(loyaltyBalances.merchantId, merchantId), eq(loyaltyBalances.userId, userId)));

      if (!balance) {
        [balance] = await tx
          .insert(loyaltyBalances)
          .values({
            merchantId,
            userId,
            points: pointsEarned,
            stamps: 0,
          })
          .returning();
      } else {
        [balance] = await tx
          .update(loyaltyBalances)
          .set({
            points: (balance.points || 0) + pointsEarned,
            updatedAt: new Date(),
          })
          .where(and(eq(loyaltyBalances.merchantId, merchantId), eq(loyaltyBalances.userId, userId)))
          .returning();
      }

      // Create loyalty event
      await tx.insert(loyaltyEvents).values({
        merchantId,
        userId,
        programId: program.id,
        type: "earn_points",
        amount: pointsEarned,
        metadata: { basketAmount, source: "transaction" },
      });

      // Check for tier upgrades
      await this.checkAndUpdateTier(tx, merchantId, userId, balance.points || 0);

      return { 
        success: true, 
        balance, 
        pointsEarned,
        basketAmount,
        message: `Earned ${pointsEarned} points from £${basketAmount.toFixed(2)} transaction`
      };
    });
  }

  async updateMemberTier(merchantId: number, userId: number, tierId: string, reason: string): Promise<any> {
    return await db.transaction(async (tx) => {
      // Get or create loyalty balance
      let [balance] = await tx
        .select()
        .from(loyaltyBalances)
        .where(and(eq(loyaltyBalances.merchantId, merchantId), eq(loyaltyBalances.userId, userId)));

      if (!balance) {
        [balance] = await tx
          .insert(loyaltyBalances)
          .values({
            merchantId,
            userId,
            points: 0,
            stamps: 0,
            tierId,
          })
          .returning();
      } else {
        [balance] = await tx
          .update(loyaltyBalances)
          .set({
            tierId,
            updatedAt: new Date(),
          })
          .where(and(eq(loyaltyBalances.merchantId, merchantId), eq(loyaltyBalances.userId, userId)))
          .returning();
      }

      // Get loyalty program for this merchant
      const [program] = await tx
        .select()
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.merchantId, merchantId));

      // Create loyalty event
      await tx.insert(loyaltyEvents).values({
        merchantId,
        userId,
        programId: program?.id,
        type: "tier_change",
        amount: 0,
        metadata: { tierId, reason, source: "manual" },
      });

      return { success: true, balance, newTierId: tierId };
    });
  }

  async createLoyaltyReward(rewardData: InsertLoyaltyReward): Promise<LoyaltyReward> {
    const [reward] = await db
      .insert(loyaltyRewards)
      .values(rewardData)
      .returning();
    return reward;
  }

  private async checkAndUpdateTier(tx: any, merchantId: number, userId: number, currentPoints: number): Promise<void> {
    // Get all tiers for this merchant's program
    const [program] = await tx
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.merchantId, merchantId));

    if (!program) return;

    const tiers = await tx
      .select()
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.programId, program.id))
      .orderBy(loyaltyTiers.thresholdPoints);

    // Find the highest tier the user qualifies for
    let qualifyingTier = null;
    for (const tier of tiers) {
      if (currentPoints >= tier.thresholdPoints) {
        qualifyingTier = tier;
      }
    }

    if (qualifyingTier) {
      // Update user's tier
      await tx
        .update(loyaltyBalances)
        .set({
          tierId: qualifyingTier.id,
          updatedAt: new Date(),
        })
        .where(and(eq(loyaltyBalances.merchantId, merchantId), eq(loyaltyBalances.userId, userId)));

      // Create tier change event
      await tx.insert(loyaltyEvents).values({
        merchantId,
        userId,
        programId: program.id,
        type: "tier_change",
        amount: 0,
        metadata: { 
          tierId: qualifyingTier.id, 
          tierName: qualifyingTier.name, 
          source: "automatic" 
        },
      });
    }
  }
}

export const storage = new DatabaseStorage();
