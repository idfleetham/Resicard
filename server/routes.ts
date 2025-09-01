import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { insertUserSchema, insertDealSchema, insertEnhancedRedemptionSchema, insertOfferSchema } from "@shared/schema";
import { eq, sql, and, gt, desc, count } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import express from "express";
import fs from "fs";
import { merchants, deals, users, vouchers, redemptions, offers, loyaltyPrograms, loyaltyTiers, loyaltyRewards } from "@shared/schema";
import QRCode from "qrcode";
import { randomUUID } from "crypto";
import { PassKitService } from "./passkit";
import { ObjectStorageService } from "./objectStorage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Initialize PassKit service
const passKitService = new PassKitService();

// Initialize Stripe (placeholder - will work when keys are provided)
let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
}

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
    console.log('No token provided in request');
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.log('JWT verification error:', err.message);
      return res.sendStatus(403);
    }
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

// Database connection is initialized in ./db.ts and imported

// Setup multer for file uploads
const upload = multer({ dest: "uploads/" });

// Helper function to get merchant ID from authenticated user
function getMerchantId(req: any): number {
  return parseInt(req.user.id);
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve uploaded files statically
  app.use("/uploads", express.static("uploads"));

  // Serve public objects from cloud storage
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Simple placeholder image endpoint
  app.get("/api/placeholder/:width/:height", (req, res) => {
    const { width, height } = req.params;
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#374151"/>
      <text x="50%" y="50%" font-family="system-ui" font-size="14" fill="#9CA3AF" text-anchor="middle" alignment-baseline="middle">
        ${width}x${height}
      </text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });
  
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

  // Update merchant business details
  app.put("/api/merchants/:id", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      
      // Verify the merchant is updating their own details
      if (merchantId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update these details" });
      }

      const { name, email, phone, address, description } = req.body;
      
      const updatedUser = await storage.updateUserBusinessDetails(req.user.id, {
        businessName: name,
        businessPhone: phone,
        businessAddress: address,
        email: email,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Merchant not found" });
      }
      
      res.json({ ...updatedUser, password: undefined });
    } catch (error: any) {
      console.error('Error updating merchant business details:', error);
      res.status(500).json({ message: "Failed to update business details" });
    }
  });

  // Update merchant profile settings
  app.put("/api/merchant", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const merchantId = getMerchantId(req);
      const payload = req.body;
      
      // Update user table business details
      const updatedUser = await storage.updateUserBusinessDetails(merchantId, {
        businessName: payload.name,
        businessPhone: payload.phone,
        businessAddress: payload.address,
        email: payload.email,
      });
      
      res.json({ ...updatedUser, password: undefined });
    } catch (error: any) {
      console.error('Error updating merchant profile:', error);
      res.status(500).json({ message: "Failed to update merchant profile" });
    }
  });

  // Upload merchant logo
  app.post("/api/merchant/upload/logo", authenticateToken, requireRole('merchant'), upload.single("file"), async (req, res) => {
    try {
      const merchantId = getMerchantId(req);
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      let logoUrl: string;
      
      try {
        // Try object storage first
        const objectStorageService = new ObjectStorageService();
        const fileName = `merchant-logos/${merchantId}-${Date.now()}-${req.file.originalname}`;
        
        logoUrl = await objectStorageService.uploadToPublicStorage(
          req.file.buffer || fs.readFileSync(req.file.path),
          fileName,
          req.file.mimetype
        );
      } catch (storageError) {
        // Fallback to base64 encoding if object storage fails
        console.log('Object storage failed, falling back to base64 encoding');
        const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
        const base64Data = fileBuffer.toString('base64');
        logoUrl = `data:${req.file.mimetype};base64,${base64Data}`;
      }
      
      // Clean up temp file
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      
      // Update user profile photo field to store logo URL or base64
      const updatedUser = await storage.updateUserProfile(merchantId, {
        profilePhoto: logoUrl
      });
      
      res.json({ ...updatedUser, password: undefined });
    } catch (error: any) {
      console.error('Error uploading merchant logo:', error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Upload offer image
  app.post("/api/merchant/offers/:id/upload", authenticateToken, requireRole('merchant'), upload.single("file"), async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      const merchantId = getMerchantId(req);
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Verify merchant owns this deal
      const deal = await storage.getDeal(dealId);
      if (!deal || deal.merchantId !== merchantId) {
        return res.status(403).json({ error: "Not authorized to update this offer" });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      
      // Update deal with new image URL
      const updatedDeal = await storage.updateDeal(dealId, {
        imageUrl: imageUrl
      });
      
      res.json(updatedDeal);
    } catch (error: any) {
      console.error('Error uploading offer image:', error);
      res.status(500).json({ message: "Failed to upload offer image" });
    }
  });

  // Offer routes
  app.get("/api/offers", async (req, res) => {
    try {
      // Get comprehensive offers directly
      const activeOffers = await db.select().from(offers).where(eq(offers.active, true));
      console.log(`Found ${activeOffers.length} active comprehensive offers`);
      
      const result = [];
      
      for (const offer of activeOffers) {
        // Get merchant info from merchants table
        const [merchant] = await db.select().from(merchants).where(eq(merchants.id, offer.merchantId));
        
        // Get user info to access profilePhoto (logo) - find user who created this merchant
        let merchantUser = null;
        // Since merchants table doesn't have createdBy, we need to find the user another way
        // For now, let's try to match by email if available
        if (merchant?.email) {
          const [user] = await db.select().from(users).where(eq(users.email, merchant.email));
          merchantUser = user;
        }
        
        const finalImageUrl = offer.imageUrl || merchantUser?.profilePhoto || merchant?.logoUrl || null;
        
        const convertedOffer = {
          id: offer.id,
          title: offer.title,
          description: offer.description || '',
          category: offer.category || 'General',
          discountType: offer.type === 'percentage_discount' ? 'percentage' : 'fixed',
          discountValue: offer.percentOff || 0,
          originalValue: null,
          usageLimit: offer.globalUsageLimit || offer.usageLimit || 999999,
          usageCount: offer.usageCount || 0,
          isActive: true,
          expiryDate: offer.validTo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          terms: offer.terms || offer.description || offer.title,
          imageUrl: finalImageUrl,
          createdAt: offer.createdAt,
          merchantId: offer.merchantId,
          merchantName: merchant?.name || 'Unknown Business',
          merchantAddress: merchant?.address || 'Address not provided'
        };
        
        result.push(convertedOffer);
      }
      
      console.log(`Returning ${result.length} offers:`, result.map(r => r.title));
      res.json(result);
      
    } catch (error: any) {
      console.error('Error in /api/offers endpoint:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create comprehensive offers
  app.post("/api/offers", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      console.log('Received comprehensive offer data:', req.body);
      
      // Get or create merchant record for this user
      let merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant) {
        // Create merchant record from user data
        merchant = await storage.createMerchantFromUser(req.user);
      }
      
      console.log('Found/created merchant:', merchant.id, 'for user:', req.user.id);
      
      // Process dates for comprehensive offers
      const processedData = {
        ...req.body,
        validFrom: req.body.validFrom ? new Date(req.body.validFrom) : new Date(),
        validTo: req.body.validTo ? new Date(req.body.validTo) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year from now
        daysOfWeek: req.body.daysOfWeek && req.body.daysOfWeek.length > 0 ? req.body.daysOfWeek : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], // Default all days
        timeSlots: req.body.timeSlots && Object.keys(req.body.timeSlots).length > 0 ? req.body.timeSlots : {}, // Default no time restrictions (all day)
        merchantId: merchant.id, // Use the merchant UUID, not user ID
      };
      
      const offerData = insertOfferSchema.parse(processedData);
      console.log('Parsed comprehensive offer data:', offerData);
      
      // Ensure merchant ID is properly set after parsing
      const finalOfferData = {
        ...offerData,
        merchantId: merchant.id
      };
      console.log('Final offer data with merchant ID:', finalOfferData.merchantId);
      
      const offer = await storage.createOffer(finalOfferData);
      
      res.json(offer);
    } catch (error: any) {
      console.error('Comprehensive offer creation error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/deals", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      console.log('Received deal data:', req.body);
      
      // Convert expiryDate string to Date object before validation
      const processedData = {
        ...req.body,
        expiryDate: new Date(req.body.expiryDate),
      };
      
      const dealData = insertDealSchema.parse(processedData);
      console.log('Parsed deal data:', dealData);
      
      const deal = await storage.createDeal({
        ...dealData,
        merchantId: req.user.id,
      });
      
      res.json(deal);
    } catch (error: any) {
      console.error('Deal creation validation error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/deals/:id", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      
      // Check if deal exists and belongs to the merchant
      const existingDeal = await storage.getDeal(dealId);
      if (!existingDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      if (existingDeal.merchantId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to update this deal" });
      }
      
      // Convert expiryDate string to Date object before validation
      const processedData = {
        ...req.body,
        expiryDate: new Date(req.body.expiryDate),
      };
      
      const dealData = insertDealSchema.parse(processedData);
      
      const updatedDeal = await storage.updateDeal(dealId, dealData);
      
      if (!updatedDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      res.json(updatedDeal);
    } catch (error: any) {
      console.error('Deal update validation error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Admin-only route to clean up demo data
  app.delete("/api/admin/cleanup-demo", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      // Delete specific demo deals and merchants
      const dealsToDelete = [1, 2, 3, 4]; // The Dunvegan, Maisha, Tailend, St Andrews Links
      const merchantsToDelete = [2, 4, 5, 6];
      
      for (const dealId of dealsToDelete) {
        await storage.deleteDeal(dealId);
      }
      
      res.json({ message: "Demo data cleaned up successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // QR Code voucher redemption endpoint
  app.post("/api/vouchers/redeem-qr", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const { voucherNumber, dealId, userId, merchantName, dealTitle } = req.body;
      
      if (!voucherNumber || !dealId || !userId) {
        return res.status(400).json({ message: "Missing required voucher data" });
      }
      
      // Find the voucher
      const voucher = await storage.getVoucherByNumber(voucherNumber);
      if (!voucher) {
        return res.status(404).json({ message: "Voucher not found" });
      }
      
      if (voucher.isUsed) {
        return res.status(400).json({ message: "Voucher has already been used" });
      }
      
      // Verify the voucher belongs to the deal
      if (voucher.dealId !== dealId) {
        return res.status(400).json({ message: "Voucher does not match the deal" });
      }
      
      // Check if voucher is expired
      if (new Date(voucher.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Voucher has expired" });
      }
      
      // Get deal and verify merchant ownership
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      if (deal.merchantId !== req.user.id) {
        return res.status(403).json({ 
          message: `This voucher is for ${merchantName || 'another business'}. You can only redeem vouchers for your own deals.` 
        });
      }
      
      // Get user info for the redemption
      const customer = await storage.getUser(userId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Mark voucher as used
      const usedVoucher = await storage.useVoucher(voucherNumber);
      
      // Create redemption record
      await storage.createRedemption({
        offerId: `deal_${dealId}`, // Convert deal ID to offer ID format
        userId: userId,
        discountValue: null,
      });
      
      res.json({
        message: "Voucher redeemed successfully",
        voucherNumber,
        dealTitle,
        customerName: customer.username,
        redeemedAt: new Date(),
      });
    } catch (error: any) {
      console.error('QR redemption error:', error);
      res.status(500).json({ message: error.message || "Failed to redeem voucher" });
    }
  });

  // Public voucher verification endpoint (no auth required)
  app.get("/api/vouchers/verify", async (req, res) => {
    try {
      const { v: voucherNumber, d: dealId, u: userId } = req.query;
      
      if (!voucherNumber || !dealId || !userId) {
        return res.status(400).json({ message: "Missing required voucher parameters" });
      }
      
      // Find the voucher
      const voucher = await storage.getVoucherByNumber(voucherNumber as string);
      if (!voucher) {
        return res.status(404).json({ message: "Voucher not found" });
      }
      
      // Get deal information
      const deal = await storage.getDeal(dealId as string);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Get customer information
      const customer = await storage.getUser(parseInt(userId as string));
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Get merchant information
      const merchant = await storage.getUser(deal.merchantId);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant not found" });
      }
      
      // Return voucher details for verification
      res.json({
        voucherNumber: voucher.voucherNumber,
        dealId: voucher.dealId,
        userId: customer.id,
        dealTitle: deal.title,
        merchantName: merchant.businessName || merchant.username,
        discountType: deal.discountType,
        discountValue: deal.discountValue,
        isUsed: voucher.isUsed,
        usedAt: voucher.usedAt,
        expiresAt: voucher.expiresAt,
        customerName: customer.username,
        customerPhoto: customer.profilePhoto
      });
    } catch (error: any) {
      console.error('Voucher verification error:', error);
      res.status(500).json({ message: error.message || "Failed to verify voucher" });
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

  // Update merchant reservation settings
  app.put("/api/merchant/reservation", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "merchant") {
        return res.status(403).json({ error: "Access denied" });
      }

      // Mock implementation - in a real app, this would save to merchant record
      const { provider, url } = req.body;
      
      // Validate URL if provider is not 'none'
      if (provider !== 'none' && url) {
        try {
          new URL(url);
        } catch {
          return res.status(400).json({ error: "Invalid URL format" });
        }
      }

      // Mock response - in real implementation, update the merchant record
      res.json({ 
        success: true, 
        reservationProvider: provider,
        reservationUrl: url || null
      });
    } catch (error: any) {
      console.error("Error updating reservation settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Voucher creation routes (replaces immediate redemptions)
  app.post("/api/redemptions", authenticateToken, requireRole('resident'), async (req, res) => {
    try {
      const { dealId } = req.body;
      const userId = req.user.id;
      
      // Check if dealId is a UUID (comprehensive offer) or integer (simple deal)
      const isUUID = typeof dealId === 'string' && dealId.includes('-');
      let deal, activeVouchersCount;
      
      if (isUUID) {
        // Handle comprehensive offers
        const [offer] = await db.select().from(offers).where(eq(offers.id, dealId));
        if (!offer) {
          return res.status(404).json({ message: "Offer not found" });
        }
        
        if (!offer.active || (offer.validTo && new Date(offer.validTo) < new Date())) {
          return res.status(400).json({ message: "Offer is no longer active" });
        }
        
        // For comprehensive offers, we'll create vouchers differently
        // Convert offer to deal-like format for voucher creation
        const expiryDate = offer.validTo 
          ? new Date(offer.validTo)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          
        deal = {
          id: dealId,
          title: offer.title,
          expiryDate: expiryDate,
          usageLimit: offer.maxPerTransaction || 100,
          isActive: offer.active ?? true
        };
        
        // Count existing vouchers for this offer (use a different storage method or mock for now)
        activeVouchersCount = 0; // For now, allow unlimited comprehensive offer redemptions
      } else {
        // Handle simple deals (integer IDs)
        const dealIdNum = parseInt(dealId);
        deal = await storage.getDeal(dealIdNum);
        if (!deal) {
          return res.status(404).json({ message: "Deal not found" });
        }
        
        if (!deal.isActive || new Date(deal.expiryDate) < new Date()) {
          return res.status(400).json({ message: "Deal is no longer active" });
        }
        
        activeVouchersCount = await storage.getActiveVouchersCount(dealIdNum);
        if (activeVouchersCount >= deal.usageLimit) {
          return res.status(400).json({ message: "Deal voucher limit reached" });
        }
      }
      
      // Generate unique voucher number
      const voucherNumber = `${dealId}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
      
      // Create voucher that expires with the deal
      // For UUID deals (comprehensive offers), we need to store the UUID in the voucherNumber for tracking
      // but use a placeholder dealId for the database
      const voucher = await storage.createVoucher({
        dealId: isUUID ? -1 : parseInt(dealId), // Use -1 as placeholder for UUID offers
        userId,
        voucherNumber,
        expiresAt: new Date(deal.expiryDate),
      });

      // Store the original dealId (UUID or integer) in the voucher response for frontend use
      const voucherWithOriginalId = {
        ...voucher,
        originalDealId: dealId // Keep the original dealId for frontend compatibility
      };
      
      res.json({ 
        voucher: voucherWithOriginalId, 
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

  // Refresh expired voucher endpoint
  app.post("/api/vouchers/refresh", authenticateToken, requireRole('resident'), async (req, res) => {
    try {
      const { voucherId } = req.body;
      const userId = req.user.id;
      
      // Get the existing voucher
      const existingVoucher = await storage.getVoucherById(voucherId);
      if (!existingVoucher) {
        return res.status(404).json({ message: "Voucher not found" });
      }
      
      // Verify the voucher belongs to the user
      if (existingVoucher.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to refresh this voucher" });
      }
      
      // Only allow refreshing expired, unused vouchers
      if (existingVoucher.isUsed) {
        return res.status(400).json({ message: "Cannot refresh used voucher" });
      }
      
      if (new Date(existingVoucher.expiresAt) >= new Date()) {
        return res.status(400).json({ message: "Voucher is not expired" });
      }
      
      // Get the original deal/offer to check availability
      const originalDealId = existingVoucher.dealId;
      const isUUID = existingVoucher.voucherNumber.includes('-') && originalDealId === -1;
      let deal;
      
      if (isUUID) {
        // Extract UUID from voucher number for comprehensive offers
        // Voucher number format: UUID-timestamp-random, so extract first 5 parts to get UUID
        const voucherParts = existingVoucher.voucherNumber.split('-');
        const dealId = voucherParts.slice(0, 5).join('-');
        const [offer] = await db.select().from(offers).where(eq(offers.id, dealId));
        if (!offer) {
          return res.status(404).json({ message: "Original offer not found" });
        }
        
        if (!offer.active || (offer.validTo && new Date(offer.validTo) < new Date())) {
          return res.status(400).json({ message: "Original offer is no longer available" });
        }
        
        deal = {
          id: dealId,
          title: offer.title,
          expiryDate: offer.validTo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
      } else {
        // Handle simple deals
        deal = await storage.getDeal(originalDealId);
        if (!deal) {
          return res.status(404).json({ message: "Original deal not found" });
        }
        
        if (!deal.isActive || new Date(deal.expiryDate) < new Date()) {
          return res.status(400).json({ message: "Original deal is no longer available" });
        }
        
        // Check usage limits for simple deals
        const activeVouchersCount = await storage.getActiveVouchersCount(originalDealId);
        if (activeVouchersCount >= deal.usageLimit) {
          return res.status(400).json({ message: "Deal voucher limit reached" });
        }
      }
      
      // Delete the old expired voucher
      await storage.deleteVoucher(voucherId, userId);
      
      // Generate new voucher number
      const voucherNumber = `${deal.id}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
      
      // Create new voucher with fresh expiration
      const newVoucher = await storage.createVoucher({
        dealId: isUUID ? -1 : originalDealId,
        userId,
        voucherNumber,
        expiresAt: new Date(deal.expiryDate),
      });
      
      res.json({ 
        voucher: newVoucher, 
        message: "Voucher refreshed successfully" 
      });
    } catch (error: any) {
      console.error('Voucher refresh error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/vouchers/:id", authenticateToken, async (req, res) => {
    try {
      const voucherId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (isNaN(voucherId)) {
        return res.status(400).json({ message: "Invalid voucher ID" });
      }
      
      const deleted = await storage.deleteVoucher(voucherId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Voucher not found or not authorized" });
      }
      
      res.json({ message: "Voucher deleted successfully" });
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

  // Subscription change endpoint
  app.post("/api/subscription/change", authenticateToken, requireRole('resident'), async (req, res) => {
    try {
      const { subscriptionType, subscriptionPlan } = req.body;
      const userId = req.user.id;
      
      if (!subscriptionType || !subscriptionPlan) {
        return res.status(400).json({ message: "Subscription type and plan are required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate new membership expiry
      const now = new Date();
      const membershipExpiry = new Date(now);
      if (subscriptionPlan === 'monthly') {
        membershipExpiry.setMonth(membershipExpiry.getMonth() + 1);
      } else {
        membershipExpiry.setFullYear(membershipExpiry.getFullYear() + 1);
      }

      // Stripe integration placeholder
      let stripeSubscriptionId = user.stripeSubscriptionId;
      let stripeCustomerId = user.stripeCustomerId;
      
      if (stripe) {
        try {
          // Create or update Stripe customer
          if (!stripeCustomerId && user.email) {
            const customer = await stripe.customers.create({
              email: user.email,
              name: user.username,
            });
            stripeCustomerId = customer.id;
          }

          // Handle subscription change in Stripe
          if (stripeSubscriptionId) {
            // Update existing subscription
            await stripe.subscriptions.update(stripeSubscriptionId, {
              items: [{
                price: process.env[`STRIPE_PRICE_${subscriptionType.toUpperCase()}_${subscriptionPlan.toUpperCase()}`],
              }],
              proration_behavior: 'create_prorations',
            });
          } else {
            // Create new subscription
            const subscription = await stripe.subscriptions.create({
              customer: stripeCustomerId,
              items: [{
                price: process.env[`STRIPE_PRICE_${subscriptionType.toUpperCase()}_${subscriptionPlan.toUpperCase()}`],
              }],
            });
            stripeSubscriptionId = subscription.id;
          }
        } catch (stripeError: any) {
          console.warn('Stripe operation failed:', stripeError.message);
          // Continue without Stripe for now
        }
      }
      
      // Update user subscription
      const updatedUser = await storage.updateUserSubscription(userId, {
        subscriptionType,
        subscriptionPlan,
        subscriptionStatus: 'active',
        membershipExpiry,
        stripeCustomerId: stripeCustomerId || undefined,
        stripeSubscriptionId: stripeSubscriptionId || undefined,
      });
      
      res.json({ 
        user: updatedUser, 
        message: `Subscription changed to ${subscriptionType} ${subscriptionPlan} plan` 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Subscription cancellation endpoint
  app.post("/api/subscription/cancel", authenticateToken, requireRole('resident'), async (req, res) => {
    try {
      const userId = req.user.id;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cancel in Stripe if configured
      if (stripe && user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: true
          });
        } catch (stripeError: any) {
          console.warn('Stripe cancellation failed:', stripeError.message);
          // Continue with local cancellation
        }
      }
      
      // Update user subscription status
      const updatedUser = await storage.updateUserSubscription(userId, {
        subscriptionType: user.subscriptionType || 'individual',
        subscriptionPlan: user.subscriptionPlan || 'monthly',
        subscriptionStatus: 'cancelled',
        membershipExpiry: user.membershipExpiry || new Date(),
        stripeCustomerId: user.stripeCustomerId || undefined,
        stripeSubscriptionId: user.stripeSubscriptionId || undefined,
      });
      
      res.json({ 
        user: updatedUser, 
        message: "Subscription cancelled. Access will continue until your current billing period ends." 
      });
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

  // Public platform statistics for homepage
  app.get("/api/analytics/platform/stats", async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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

  // Merchant Portal API Routes
  
  // Get merchant's own deals
  app.get("/api/deals/my-deals", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const deals = await storage.getDealsByMerchant(req.user.id);
      res.json(deals);
    } catch (error) {
      console.error("Error fetching merchant deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // Get comprehensive offers for merchant
  app.get("/api/offers/my-offers", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      // Get or create merchant record for this user
      let merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant) {
        merchant = await storage.createMerchantFromUser(req.user);
      }
      
      const offers = await storage.getOffersByMerchant(merchant.id);
      res.json(offers);
    } catch (error) {
      console.error('Error getting merchant offers:', error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  });

  // Get single comprehensive offer details
  app.get("/api/offers/:id", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const offerId = req.params.id;
      const offer = await storage.getOffer(offerId);
      
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      
      // Check if merchant owns this offer
      let merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant || merchant.id !== offer.merchantId) {
        return res.status(403).json({ error: "Not authorized to view this offer" });
      }
      
      res.json(offer);
    } catch (error) {
      console.error('Error getting offer details:', error);
      res.status(500).json({ error: "Failed to fetch offer details" });
    }
  });

  // Update comprehensive offer
  app.put("/api/offers/:id", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const offerId = req.params.id;
      const updates = req.body;
      
      console.log('PUT /api/offers/:id - Raw updates received:', JSON.stringify(updates, null, 2));
      
      // Check each field type that could cause issues
      if (updates.tags) console.log('Tags type:', typeof updates.tags, Array.isArray(updates.tags), updates.tags);
      if (updates.daysOfWeek) console.log('DaysOfWeek type:', typeof updates.daysOfWeek, Array.isArray(updates.daysOfWeek), updates.daysOfWeek);
      if (updates.mealPeriods) console.log('MealPeriods type:', typeof updates.mealPeriods, Array.isArray(updates.mealPeriods), updates.mealPeriods);
      if (updates.timeSlots) console.log('TimeSlots type:', typeof updates.timeSlots, updates.timeSlots);
      
      // Validate using insertOfferSchema (partial)
      const validation = insertOfferSchema.partial().safeParse(updates);
      if (!validation.success) {
        console.error('Full validation error details:');
        validation.error.errors.forEach(error => {
          console.error(`  Field: ${error.path.join('.')} - ${error.message} - Received: ${typeof updates[error.path[0]]} ${JSON.stringify(updates[error.path[0]])}`);
        });
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validation.error.errors 
        });
      }
      
      // Check if offer exists and merchant owns it
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      
      let merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant || merchant.id !== offer.merchantId) {
        return res.status(403).json({ error: "Not authorized to update this offer" });
      }
      
      const updatedOffer = await storage.updateOffer(offerId, validation.data);
      res.json(updatedOffer);
    } catch (error) {
      console.error('Error updating offer:', error);
      res.status(500).json({ error: "Failed to update offer" });
    }
  });

  // Toggle comprehensive offer active status
  app.post("/api/offers/:id/toggle", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const offerId = req.params.id;
      
      // Check if offer exists and merchant owns it
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      
      let merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant || merchant.id !== offer.merchantId) {
        return res.status(403).json({ error: "Not authorized to toggle this offer" });
      }
      
      const updatedOffer = await storage.updateOffer(offerId, { active: !offer.active });
      res.json(updatedOffer);
    } catch (error) {
      console.error('Error toggling offer:', error);
      res.status(500).json({ error: "Failed to toggle offer" });
    }
  });

  // Get redemptions for a merchant - completely minimal version
  app.get("/api/redemptions/merchant/:merchantId?", async (req, res) => {
    console.log('Redemptions endpoint called - minimal version');
    res.status(200).json([{
      id: 1,
      offer_id: 'test',
      user_id: 30,
      redeemed_at: new Date().toISOString(),
      value: '10',
      voucher_code: 'TEST-123',
      offerTitle: 'Test Offer',
      customerName: 'user',
      staffName: 'System'
    }]);
  });

  // Process voucher redemption
  app.post("/api/redemptions/redeem", authenticateToken, requireRole('merchant'), async (req, res) => {
    const { voucherCode, staffPin, basketAmount } = req.body;

    if (!voucherCode || !staffPin) {
      return res.status(400).json({ error: "Voucher code and staff PIN required" });
    }

    try {
      // Find the voucher to get deal details
      const voucher = await storage.getVoucherByNumber(voucherCode);
      if (!voucher) {
        return res.status(404).json({ error: "Voucher not found" });
      }

      // Check if voucher is already used
      if (voucher.isUsed) {
        return res.status(400).json({ error: "Voucher has already been redeemed" });
      }

      // Handle both legacy offers and UUID-based offers
      let offer = null;
      let isUuidOffer = false;
      
      if (voucher.dealId === -1) {
        // This is a UUID offer voucher - extract offer ID from voucherNumber
        const uuidMatch = voucher.voucherNumber.match(/^([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})-/i);
        
        if (uuidMatch) {
          const offerId = uuidMatch[1].toLowerCase();
          
          // Get offer from offers table
          const offerData = await storage.getOffer(offerId);
          if (!offerData) {
            return res.status(404).json({ error: "Offer not found" });
          }
          
          // Use offer structure directly
          offer = {
            id: offerData.id,
            merchantId: offerData.merchantId,
            title: offerData.title,
            discountType: offerData.type === 'percentage_discount' ? 'percentage' : 'fixed',
            discountValue: offerData.percentOff?.toString() || offerData.fixedPrice?.toString() || '0'
          };
          isUuidOffer = true;
        } else {
          return res.status(400).json({ error: "Invalid voucher format" });
        }
      } else {
        // Legacy offer voucher (stored in deals table)
        const legacyOffer = await storage.getDeal(voucher.dealId);
        if (!legacyOffer) {
          return res.status(404).json({ error: "Offer not found" });
        }
        
        // Convert legacy deal to offer structure
        offer = {
          id: legacyOffer.id,
          merchantId: legacyOffer.merchantId,
          title: legacyOffer.title,
          discountType: legacyOffer.discountType,
          discountValue: legacyOffer.discountValue
        };
      }

      // Get merchant information to verify authorization
      const merchant = await storage.getMerchantByUserId(req.user.id);
      if (!merchant) {
        return res.status(403).json({ error: "Merchant not found" });
      }

      // Verify merchant owns this offer
      if (isUuidOffer) {
        // For UUID offers, compare with merchant UUID
        if (offer.merchantId !== merchant.id) {
          return res.status(403).json({ error: "Not authorized to redeem this voucher" });
        }
      } else {
        // For legacy offers, compare with user ID
        if (offer.merchantId !== req.user.id) {
          return res.status(403).json({ error: "Not authorized to redeem this voucher" });
        }
      }

      // Calculate discount
      const basketValue = basketAmount ? parseFloat(basketAmount) : 0;
      let discountValue = 0;
      
      if (offer.discountType === 'percentage') {
        discountValue = basketValue * (parseFloat(offer.discountValue || '0') / 100);
      } else {
        discountValue = parseFloat(offer.discountValue || '0');
      }

      const finalValue = Math.max(0, basketValue - discountValue);

      // Since the current system uses legacy offers table, let's mark the voucher as used
      // This tracks the redemption in the existing vouchers table

      // Mark voucher as used
      await storage.useVoucher(voucherCode);
      
      res.json({
        success: true,
        discount: discountValue.toFixed(2),
        finalValue: finalValue.toFixed(2),
        message: "Voucher redeemed successfully"
      });
    } catch (error) {
      console.error("Error redeeming voucher:", error);
      res.status(500).json({ error: "Failed to redeem voucher" });
    }
  });

  // Generate QR code for offer
  app.post("/api/offers/generate-qr", authenticateToken, requireRole('merchant'), async (req, res) => {
    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({ error: "Offer ID required" });
    }

    try {
      const qrData = `OFFER:${offerId}:${Date.now()}`;
      
      res.json({
        qrCode: qrData,
        offerId: offerId,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // Toggle offer active status
  app.post("/api/merchant/offers/:id/toggle", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      
      // Get current deal and verify ownership
      const existingDeal = await storage.getDeal(dealId);
      if (!existingDeal) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      if (existingDeal.merchantId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to modify this offer" });
      }
      
      // Toggle the active status
      const updatedDeal = await storage.updateDeal(dealId, { 
        isActive: !existingDeal.isActive 
      });
      
      res.json(updatedDeal);
    } catch (error: any) {
      console.error('Deal toggle error:', error);
      res.status(500).json({ message: error.message || "Failed to toggle offer" });
    }
  });

  // Get single offer by ID for merchant
  app.get("/api/merchant/offers/:id", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      if (deal.merchantId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to view this offer" });
      }
      
      res.json(deal);
    } catch (error: any) {
      console.error('Error fetching offer:', error);
      res.status(500).json({ message: error.message || "Failed to fetch offer" });
    }
  });

  // Update offer for merchant with proper validation
  app.put("/api/merchant/offers/:id", authenticateToken, requireRole('merchant'), async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      
      // Check if deal exists and belongs to the merchant
      const existingDeal = await storage.getDeal(dealId);
      if (!existingDeal) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      if (existingDeal.merchantId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this offer" });
      }
      
      // Process the update data
      const processedData = {
        ...req.body
      };
      
      // Convert expiryDate if provided
      if (req.body.expiryDate) {
        processedData.expiryDate = new Date(req.body.expiryDate);
      }
      
      // Validate the data
      const dealData = insertDealSchema.partial().parse(processedData);
      
      const updatedDeal = await storage.updateDeal(dealId, dealData);
      
      res.json(updatedDeal);
    } catch (error: any) {
      console.error('Deal update validation error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // LOYALTY PROGRAM ENDPOINTS (Mock implementation for now)
  
  // Mock data store for tiers (in a real app, this would be in the database)
  let mockTiers = [
    { id: "bronze", name: "Bronze", thresholdPoints: 0, perks: [{ type: "percentOff", value: 5 }] },
    { id: "silver", name: "Silver", thresholdPoints: 100, perks: [{ type: "percentOff", value: 10 }] },
    { id: "gold", name: "Gold", thresholdPoints: 500, perks: [{ type: "percentOff", value: 15 }] }
  ];

  // Get merchant's loyalty program
  app.get("/api/loyalty/program", authenticateToken, async (req, res) => {
    try {
      // Mock response until DB is set up
      res.json({
        id: "mock-program-1",
        merchantId: req.user.merchantId || req.user.id,
        model: "points",
        pointsPerCurrency: 10,
        minBasketEarn: 5.00,
        earnCooldownMinutes: 30,
        dailyEarnCap: 3,
        active: true,
        tiers: mockTiers,
        rewards: [
          { id: "reward-1", name: "Free Coffee", costPoints: 50, active: true },
          { id: "reward-2", name: "20% Off Meal", costPoints: 100, active: true }
        ]
      });
    } catch (error) {
      console.error('Get loyalty program error:', error);
      res.status(500).json({ error: "Failed to fetch loyalty program" });
    }
  });

  // Create/Update loyalty program
  app.post("/api/loyalty/program", authenticateToken, async (req, res) => {
    try {
      // Mock response
      res.json({ success: true, program: req.body });
    } catch (error) {
      console.error('Create loyalty program error:', error);
      res.status(500).json({ error: "Failed to save loyalty program" });
    }
  });

  // Add new tier
  app.post("/api/loyalty/tiers", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "merchant") {
        return res.status(403).json({ error: "Access denied" });
      }

      const { name, thresholdPoints, perks } = req.body;
      
      // Create new tier and add to mock data
      const newTier = {
        id: `tier-${Date.now()}`,
        name: name || "New Tier",
        thresholdPoints: thresholdPoints || 0,
        perks: perks || [{ type: "percentOff", value: 5 }]
      };

      // Add to mock tiers array
      mockTiers.push(newTier);

      res.json({ success: true, tier: newTier });
    } catch (error) {
      console.error("Error adding tier:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update tier
  app.put("/api/loyalty/tiers/:tierId", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "merchant") {
        return res.status(403).json({ error: "Access denied" });
      }

      const { tierId } = req.params;
      const { name, thresholdPoints, perks } = req.body;
      
      // Find and update tier in mock data
      const tierIndex = mockTiers.findIndex(tier => tier.id === tierId);
      if (tierIndex !== -1) {
        mockTiers[tierIndex] = {
          id: tierId,
          name,
          thresholdPoints,
          perks
        };
      }

      res.json({ success: true, tier: mockTiers[tierIndex] });
    } catch (error) {
      console.error("Error updating tier:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete tier
  app.delete("/api/loyalty/tiers/:tierId", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "merchant") {
        return res.status(403).json({ error: "Access denied" });
      }

      const { tierId } = req.params;
      
      // Remove tier from mock data
      const tierIndex = mockTiers.findIndex(tier => tier.id === tierId);
      if (tierIndex !== -1) {
        mockTiers.splice(tierIndex, 1);
      }
      
      res.json({ success: true, deletedTierId: tierId });
    } catch (error) {
      console.error("Error deleting tier:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get customer loyalty balance
  app.get("/api/loyalty/balance/:merchantId", authenticateToken, async (req, res) => {
    try {
      // Mock customer balance
      res.json({
        points: 75,
        stamps: 3,
        tier: { name: "Silver", perks: [{ type: "percentOff", value: 10 }] }
      });
    } catch (error) {
      console.error('Get loyalty balance error:', error);
      res.status(500).json({ error: "Failed to fetch loyalty balance" });
    }
  });

  // Earn points/stamps (staff endpoint)
  app.post("/api/loyalty/earn", authenticateToken, async (req, res) => {
    try {
      const { amount, type } = req.body;
      
      // Mock earning logic
      const pointsAdded = type === 'purchase' ? Math.floor(amount * 10) : 0;
      const stampsAdded = type === 'visit' ? 1 : 0;
      
      res.json({ 
        success: true, 
        pointsAdded, 
        stampsAdded,
        newBalance: { points: 85, stamps: 4 }
      });
    } catch (error) {
      console.error('Earn loyalty error:', error);
      res.status(500).json({ error: "Failed to process earning" });
    }
  });

  // Redeem reward
  app.post("/api/loyalty/redeem", authenticateToken, async (req, res) => {
    try {
      const { rewardId } = req.body;
      
      // Mock redemption
      res.json({ 
        success: true, 
        message: "Reward redeemed successfully!",
        pointsDeducted: 50
      });
    } catch (error) {
      console.error('Redeem reward error:', error);
      res.status(500).json({ error: "Failed to redeem reward" });
    }
  });

  // Get loyalty events/history  
  app.get("/api/loyalty/events/:merchantId", authenticateToken, async (req, res) => {
    try {
      // Mock events
      res.json([
        {
          id: "event-1",
          type: "earn_points",
          amount: 25,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          metadata: { purchase: 2.50 }
        },
        {
          id: "event-2", 
          type: "redeem_reward",
          amount: -50,
          createdAt: new Date(Date.now() - 172800000), // 2 days ago
          metadata: { rewardName: "Free Coffee" }
        }
      ]);
    } catch (error) {
      console.error('Get loyalty events error:', error);
      res.status(500).json({ error: "Failed to fetch loyalty events" });
    }
  });

  // Apple Wallet Pass endpoints
  // Public Apple Wallet pass endpoint (no auth required for QR code access)
  app.get("/api/wallet/pass", async (req, res) => {
    try {
      if (!process.env.PASS_TYPE_IDENTIFIER || !process.env.TEAM_IDENTIFIER) {
        // Serve a simple HTML error page directly
        return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apple Wallet Configuration</title>
</head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem">
  <div style="background:white;border-radius:1.5rem;padding:2rem;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);max-width:28rem;width:100%">
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
      <div style="width:2rem;height:2rem;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="color:#dc2626;font-size:1.125rem">⚠</span>
      </div>
      <h1 style="color:#7f1d1d;font-weight:600;font-size:1.125rem;margin:0">Apple Wallet Configuration</h1>
    </div>
    <p style="color:#b91c1c;margin:1rem 0;line-height:1.5">
      Apple Wallet integration is not yet configured on this server. The digital membership card feature will be available once the administrator sets up the required certificates.
    </p>
    <p style="color:#dc2626;font-size:0.875rem;margin:1rem 0 0 0">
      Please contact support for assistance or check back later.
    </p>
    <div style="margin-top:1.5rem">
      <a href="/" style="display:inline-block;background:#3b82f6;color:white;padding:0.5rem 1rem;border-radius:0.5rem;text-decoration:none;font-size:0.875rem;font-weight:500">
        Return to Home
      </a>
    </div>
  </div>
</body>
</html>
        `);
      }

      // For now, redirect to the authenticated endpoint
      // In production, this would generate a pass based on QR code parameters
      res.redirect('/wallet/resicard.pkpass');
    } catch (error) {
      console.error('Pass generation error:', error);
      // Serve error page directly instead of redirect
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apple Wallet Error</title>
</head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem">
  <div style="background:white;border-radius:1.5rem;padding:2rem;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);max-width:28rem;width:100%">
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
      <div style="width:2rem;height:2rem;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="color:#dc2626;font-size:1.125rem">⚠</span>
      </div>
      <h1 style="color:#7f1d1d;font-weight:600;font-size:1.125rem;margin:0">Apple Wallet Error</h1>
    </div>
    <p style="color:#b91c1c;margin:1rem 0;line-height:1.5">
      Failed to generate Apple Wallet pass. There was a technical issue with the pass generation service.
    </p>
    <p style="color:#dc2626;font-size:0.875rem;margin:1rem 0 0 0">
      Please try again later or contact support for assistance.
    </p>
    <div style="margin-top:1.5rem">
      <a href="/" style="display:inline-block;background:#3b82f6;color:white;padding:0.5rem 1rem;border-radius:0.5rem;text-decoration:none;font-size:0.875rem;font-weight:500">
        Return to Home
      </a>
    </div>
  </div>
</body>
</html>
      `);
    }
  });

  app.get("/wallet/resicard.pkpass", authenticateToken, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!passKitService.isConfigured()) {
      return res.status(503).json({ 
        error: "Apple Wallet pass service not configured. Please set PASS_TYPE_IDENTIFIER and TEAM_IDENTIFIER environment variables." 
      });
    }

    try {
      // Fetch additional user/merchant data for pass
      const userData = {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        loyaltyPoints: req.user.loyaltyPoints || 0,
        loyaltyTier: req.user.loyaltyTier || 'Standard',
        memberSince: req.user.createdAt ? new Date(req.user.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
        merchantName: 'Resicard St Andrews', // Default - could be merchant-specific
        offerTitle: '20% Off First Order',
        category: 'Food & Drink',
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'), // 90 days from now
        bookingUrl: 'https://resicard.co.uk/booking',
        contactInfo: 'Email: support@resicard.co.uk\nPhone: +44 1334 123456\nWebsite: resicard.co.uk',
        logoUrl: undefined // Could be fetched from merchant data
      };

      const passBuffer = await passKitService.generatePass(userData);
      
      res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
      res.setHeader('Content-Disposition', 'attachment; filename="resicard.pkpass"');
      res.send(passBuffer);
    } catch (error) {
      console.error('Failed to generate Apple Wallet pass:', error);
      res.status(500).json({ error: "Failed to generate pass" });
    }
  });

  // Apple Wallet pass update endpoints (for future use)
  app.post("/api/wallet/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber", (req, res) => {
    // Register device for pass updates
    console.log('Device registration for pass updates:', {
      deviceId: req.params.deviceLibraryIdentifier,
      passType: req.params.passTypeIdentifier,
      serialNumber: req.params.serialNumber,
      authToken: req.headers.authorization
    });
    res.status(201).send();
  });

  app.delete("/api/wallet/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber", (req, res) => {
    // Unregister device for pass updates
    console.log('Device unregistration for pass updates:', {
      deviceId: req.params.deviceLibraryIdentifier,
      passType: req.params.passTypeIdentifier,
      serialNumber: req.params.serialNumber
    });
    res.status(200).send();
  });

  app.get("/api/wallet/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier", (req, res) => {
    // Get list of updatable passes for device
    const lastUpdated = req.query.passesUpdatedSince;
    console.log('Check for pass updates:', {
      deviceId: req.params.deviceLibraryIdentifier,
      passType: req.params.passTypeIdentifier,
      lastUpdated
    });
    
    // Return empty list for now - implement when push updates are needed
    res.json({
      lastUpdated: new Date().toISOString(),
      serialNumbers: []
    });
  });

  app.get("/api/wallet/v1/passes/:passTypeIdentifier/:serialNumber", (req, res) => {
    // Get updated pass
    console.log('Request for updated pass:', {
      passType: req.params.passTypeIdentifier,
      serialNumber: req.params.serialNumber,
      authToken: req.headers.authorization
    });
    
    // For now, return 304 Not Modified
    res.status(304).send();
  });

  app.post("/api/wallet/v1/log", (req, res) => {
    // Log messages from Wallet app
    console.log('Wallet app log:', req.body);
    res.status(200).send();
  });

  const httpServer = createServer(app);

  return httpServer;
}
