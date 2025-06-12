import { users, deals, redemptions, type User, type InsertUser, type Deal, type InsertDeal, type Redemption, type InsertRedemption, type DealWithMerchant } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getPendingBusinesses(): Promise<User[]>;
  verifyBusiness(id: number): Promise<User | undefined>;
  
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

export const storage = new MemStorage();
