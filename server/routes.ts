import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { insertUserSchema, insertDealSchema, insertRedemptionSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Extend the Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to verify JWT token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Middleware to check if user has required role
function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (req.user.role !== role) {
      return res.sendStatus(403);
    }
    next();
  };
}

// UK postcode validation - basic implementation for St Andrews area
function validatePostcode(postcode: string): boolean {
  const stAndrewsPostcodes = ['KY16', 'KY15', 'DD6', 'DD5'];
  const postcodePrefix = postcode.toUpperCase().substring(0, 4);
  return stAndrewsPostcodes.some(prefix => postcodePrefix.startsWith(prefix));
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Validate postcode for residents
      if (userData.role === 'resident' && userData.postcode) {
        if (!validatePostcode(userData.postcode)) {
          return res.status(400).json({ 
            message: "Postcode is outside the St Andrews area (must be within 10 miles)" 
          });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin registration endpoint (protected)
  app.post("/api/auth/register-admin", async (req, res) => {
    try {
      const { username, email, password, adminSecret } = req.body;
      
      // Check admin secret (simple protection - in production use better security)
      if (adminSecret !== "localperks-admin-2024") {
        return res.status(403).json({ message: "Invalid admin secret" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: 'admin',
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update user profile
  app.put("/api/profile", authenticateToken, async (req, res) => {
    try {
      const { username, email, profilePhoto } = req.body;
      
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        username,
        email,
        profilePhoto,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...updatedUser, password: undefined });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Deal routes
  app.get("/api/deals", async (req, res) => {
    try {
      const { category } = req.query;
      let deals;
      
      if (category) {
        deals = await storage.getDealsByCategory(category as string);
      } else {
        deals = await storage.getActiveDeals();
      }
      
      res.json(deals);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/deals", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const dealData = insertDealSchema.parse(req.body);
      
      const deal = await storage.createDeal({
        ...dealData,
        merchantId: req.user.id,
      });
      
      res.json(deal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/deals/merchant/:merchantId", authenticateToken, async (req, res) => {
    try {
      const merchantId = parseInt(req.params.merchantId);
      
      // Only allow merchants to view their own deals or admins to view any
      if (req.user.role !== 'admin' && req.user.id !== merchantId) {
        return res.sendStatus(403);
      }
      
      const deals = await storage.getDealsByMerchant(merchantId);
      res.json(deals);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/deals/:id", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      const updates = req.body;
      
      // Verify merchant owns this deal
      const deal = await storage.getDeal(dealId);
      if (!deal || deal.merchantId !== req.user.id) {
        return res.sendStatus(403);
      }
      
      const updatedDeal = await storage.updateDeal(dealId, updates);
      res.json(updatedDeal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/deals/:id", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      
      // Verify merchant owns this deal
      const deal = await storage.getDeal(dealId);
      if (!deal || deal.merchantId !== req.user.id) {
        return res.sendStatus(403);
      }
      
      const deleted = await storage.deleteDeal(dealId);
      res.json({ success: deleted });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Voucher creation routes (replaces immediate redemptions)
  app.post("/api/redemptions", authenticateToken, requireRole('resident'), async (req, res) => {
    try {
      const { dealId } = req.body;
      const userId = req.user.id;
      
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      if (!deal.isActive || new Date(deal.expiryDate) < new Date()) {
        return res.status(400).json({ message: "Deal is no longer active" });
      }
      
      // Check current voucher count for this deal
      const activeVouchersCount = await storage.getActiveVouchersCount(dealId);
      if (activeVouchersCount >= deal.usageLimit) {
        return res.status(400).json({ message: "Deal voucher limit reached" });
      }
      
      // Generate unique voucher number
      const voucherNumber = `${dealId}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
      
      // Create voucher that expires with the deal
      const voucher = await storage.createVoucher({
        dealId,
        userId,
        voucherNumber,
        expiresAt: new Date(deal.expiryDate),
      });
      
      res.json({ 
        voucher, 
        voucherPosition: `${activeVouchersCount + 1} of ${deal.usageLimit}`,
        message: "Voucher created successfully" 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Voucher wallet routes
  app.get("/api/vouchers/user/:userId", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Only allow users to view their own vouchers or admins to view any
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.sendStatus(403);
      }
      
      const vouchers = await storage.getVouchersByUser(userId);
      res.json(vouchers);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/vouchers/use", authenticateToken, async (req, res) => {
    try {
      const { voucherNumber } = req.body;
      
      const voucher = await storage.getVoucherByNumber(voucherNumber);
      if (!voucher) {
        return res.status(404).json({ message: "Voucher not found" });
      }
      
      if (voucher.isUsed) {
        return res.status(400).json({ message: "Voucher already used" });
      }
      
      if (new Date() > new Date(voucher.expiresAt)) {
        return res.status(400).json({ message: "Voucher has expired" });
      }
      
      const usedVoucher = await storage.useVoucher(voucherNumber);
      res.json({ voucher: usedVoucher, message: "Voucher redeemed successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/redemptions/user/:userId", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Only allow users to view their own redemptions or admins to view any
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.sendStatus(403);
      }
      
      const redemptions = await storage.getRedemptionsByUser(userId);
      res.json(redemptions);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/redemptions/merchant/:merchantId", authenticateToken, async (req, res) => {
    try {
      const merchantId = parseInt(req.params.merchantId);
      
      // Only allow merchants to view their own redemptions or admins to view any
      if (req.user.role !== 'admin' && req.user.id !== merchantId) {
        return res.sendStatus(403);
      }
      
      const redemptions = await storage.getRedemptionsByMerchant(merchantId);
      res.json(redemptions);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Subscription management routes
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = {
        individual: {
          monthly: { price: 9.99, priceId: "price_individual_monthly" },
          annual: { price: 99, priceId: "price_individual_annual" }
        },
        family: {
          monthly: { price: 19.99, priceId: "price_family_monthly" },
          annual: { price: 199, priceId: "price_family_annual" }
        }
      };
      res.json(plans);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/subscription/create", authenticateToken, requireRole('resident'), async (req, res) => {
    try {
      const { subscriptionType, subscriptionPlan, familyMembers } = req.body;
      const userId = req.user.id;
      
      // Get user details to check verification status
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user has profile photo
      if (!user.profilePhoto) {
        return res.status(400).json({ 
          message: "Profile photo required. Please add a profile photo to your account before purchasing a subscription.",
          code: "PROFILE_PHOTO_REQUIRED"
        });
      }
      
      // Check if user's residency is verified
      if (!user.isResidencyVerified) {
        return res.status(400).json({ 
          message: "Account verification required. Please wait for your residency documents to be verified before purchasing a subscription.",
          code: "VERIFICATION_REQUIRED"
        });
      }
      
      // For family subscriptions, validate family members
      if (subscriptionType === 'family') {
        if (!familyMembers || !Array.isArray(familyMembers) || familyMembers.length === 0) {
          return res.status(400).json({ 
            message: "Family members required. Please add at least one family member for a family subscription.",
            code: "FAMILY_MEMBERS_REQUIRED"
          });
        }
        
        // Validate each family member
        for (const member of familyMembers) {
          if (!member.firstName || !member.surname || !member.age || !member.relationship) {
            return res.status(400).json({ 
              message: "All family member details are required (name, age, relationship).",
              code: "INVALID_FAMILY_MEMBER"
            });
          }
          
          if (member.age > 17 && member.relationship === 'child') {
            return res.status(400).json({ 
              message: "Children must be 17 years old or under.",
              code: "INVALID_CHILD_AGE"
            });
          }
        }
      }
      
      // Calculate membership expiry
      const now = new Date();
      const membershipExpiry = new Date(now);
      if (subscriptionPlan === 'monthly') {
        membershipExpiry.setMonth(membershipExpiry.getMonth() + 1);
      } else {
        membershipExpiry.setFullYear(membershipExpiry.getFullYear() + 1);
      }
      
      // Save family members if this is a family subscription
      if (subscriptionType === 'family' && familyMembers && familyMembers.length > 0) {
        await storage.createFamilyMembers(userId, familyMembers);
      }
      
      const updatedUser = await storage.updateUserSubscription(userId, {
        subscriptionType,
        subscriptionPlan,
        subscriptionStatus: 'active',
        membershipExpiry,
      });
      
      res.json({ user: updatedUser, message: "Subscription created successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/subscription/status", authenticateToken, requireRole('resident'), async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const subscription = {
        type: user.subscriptionType,
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus,
        expiresAt: user.membershipExpiry,
        isActive: user.subscriptionStatus === 'active' && (!user.membershipExpiry || new Date() < new Date(user.membershipExpiry))
      };
      
      res.json(subscription);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin routes
  app.get("/api/admin/pending-businesses", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const businesses = await storage.getPendingBusinesses();
      res.json(businesses);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/verify-business/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const businessId = parseInt(req.params.id);
      const verifiedBusiness = await storage.verifyBusiness(businessId);
      res.json(verifiedBusiness);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/stats", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { role } = req.query;
      let users;
      
      if (role) {
        users = await storage.getUsersByRole(role as string);
      } else {
        const residents = await storage.getUsersByRole('resident');
        const merchants = await storage.getUsersByRole('merchant');
        users = [...residents, ...merchants];
      }
      
      // Remove passwords from response
      const safeUsers = users.map(user => ({ ...user, password: undefined }));
      res.json(safeUsers);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/pending-businesses", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const pendingBusinesses = await storage.getPendingBusinesses();
      const safeBusinesses = pendingBusinesses.map(user => ({ ...user, password: undefined }));
      res.json(safeBusinesses);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Document verification routes
  app.post("/api/documents/submit", authenticateToken, async (req, res) => {
    try {
      const { documentType, documentFile } = req.body;
      const userId = req.user.id;
      
      console.log(`Document submission for user ${userId}:`, {
        documentType,
        documentFileLength: documentFile?.length || 0,
        hasDocumentFile: !!documentFile
      });
      
      if (!documentType) {
        return res.status(400).json({ message: "Document type is required" });
      }
      
      if (!documentFile) {
        return res.status(400).json({ message: "Document file is required" });
      }
      
      // Check file size limit (400KB base64 = ~300KB actual)
      if (documentFile.length > 400000) {
        return res.status(400).json({ message: "Document file is too large. Please compress or resize your document." });
      }
      
      const updatedUser = await storage.submitDocument(userId, {
        documentType,
        documentFile,
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to save document. Please try again." });
      }
      
      console.log(`Document submitted successfully for user ${userId}:`, {
        documentType: updatedUser?.documentType,
        documentStatus: updatedUser?.documentStatus,
        hasDocumentFile: !!updatedUser?.documentFile
      });
      
      res.json({ user: updatedUser, message: "Document submitted for verification" });
    } catch (error: any) {
      console.error(`Error submitting document for user ${req.user?.id}:`, error);
      
      // Provide more specific error messages
      if (error.message?.includes('connection')) {
        res.status(500).json({ message: "Database connection error. Please try again in a moment." });
      } else if (error.message?.includes('timeout')) {
        res.status(500).json({ message: "Request timed out. Please try with a smaller file." });
      } else {
        res.status(400).json({ message: error.message || "Failed to submit document" });
      }
    }
  });

  app.get("/api/admin/pending-documents", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const pendingDocuments = await storage.getPendingDocuments();
      
      console.log(`Retrieved ${pendingDocuments.length} pending documents:`);
      pendingDocuments.forEach(user => {
        console.log(`User ${user.id} (${user.username}):`, {
          documentType: user.documentType,
          documentStatus: user.documentStatus,
          hasDocumentFile: !!user.documentFile,
          documentFileLength: user.documentFile?.length || 0,
          submittedAt: user.documentSubmittedAt
        });
      });
      
      const safeDocuments = pendingDocuments.map(user => ({ ...user, password: undefined }));
      res.json(safeDocuments);
    } catch (error: any) {
      console.error('Error retrieving pending documents:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/documents/:userId/approve", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const reviewerId = req.user.id;
      
      const updatedUser = await storage.approveDocument(userId, reviewerId);
      res.json({ user: updatedUser, message: "Document approved" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/documents/:userId/reject", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const reviewerId = req.user.id;
      
      const updatedUser = await storage.rejectDocument(userId, reviewerId);
      res.json({ user: updatedUser, message: "Document rejected" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/verify-business/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const verifiedBusiness = await storage.verifyBusiness(id);
      if (verifiedBusiness) {
        res.json({ ...verifiedBusiness, password: undefined });
      } else {
        res.status(404).json({ message: "Business not found" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/reject-business/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rejected = await storage.rejectBusiness(id);
      if (rejected) {
        res.json({ message: "Business rejected and removed" });
      } else {
        res.status(404).json({ message: "Business not found or already verified" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Analytics routes
  app.get("/api/analytics/merchant/:merchantId/revenue", authenticateToken, async (req, res) => {
    try {
      const merchantId = parseInt(req.params.merchantId);
      
      // Only allow merchants to view their own revenue or admins to view any
      if (req.user.role !== 'admin' && req.user.id !== merchantId) {
        return res.sendStatus(403);
      }
      
      const revenue = await storage.getMerchantRevenue(merchantId);
      res.json({ revenue });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/analytics/deal/:dealId/stats", authenticateToken, async (req, res) => {
    try {
      const dealId = parseInt(req.params.dealId);
      const stats = await storage.getDealStats(dealId);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
