import { createServer, type Server } from "http";
import type { Express } from "express";
import { authRouter } from "./auth";
import { profileRouter } from "./profile";
import { verificationRouter } from "./verification";
import { householdRouter } from "./household";
import { publicRouter } from "./public";
import { redemptionsRouter } from "./redemptions";
import { outletsRouter } from "./outlets";
import { merchantRouter } from "./merchant";
import { merchantVerifyRouter } from "./merchant-verify";
import { merchantAnalyticsRouter } from "./merchant-analytics";
import { merchantCampaignsRouter } from "./merchant-campaigns";
import { campaignsRouter } from "./campaigns";
import { loyaltyRouter } from "./loyalty";
import { activityRouter } from "./activity";
import { savingsRouter } from "./savings";
import { referralsRouter } from "./referrals";
import { jobsRouter } from "./jobs";
import { adminRouter } from "./admin";
import { adminMerchantsRouter } from "./admin-merchants";
import { adminPricesRouter } from "./admin-prices";
import { adminRevenueRouter } from "./admin-revenue";

/** Mounts every API router and returns the HTTP server for Vite's HMR and listen(). */
export function registerRoutes(app: Express): Server {
  app.use(authRouter);
  app.use(profileRouter);
  app.use(verificationRouter);
  app.use(householdRouter);
  app.use(publicRouter);
  app.use(redemptionsRouter);
  app.use(outletsRouter);
  app.use(merchantRouter);
  app.use(merchantVerifyRouter);
  app.use(merchantAnalyticsRouter);
  app.use(merchantCampaignsRouter);
  app.use(campaignsRouter);
  app.use(loyaltyRouter);
  app.use(activityRouter);
  app.use(savingsRouter);
  app.use(referralsRouter);
  app.use(jobsRouter);
  app.use(adminRouter);
  app.use(adminMerchantsRouter);
  app.use(adminPricesRouter);
  app.use(adminRevenueRouter);

  // Unknown API paths get a JSON 404 rather than the client's index.html.
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  return createServer(app);
}
