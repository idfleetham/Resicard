import { createServer, type Server } from "http";
import type { Express } from "express";
import { authRouter } from "./auth";
import { profileRouter } from "./profile";
import { householdRouter } from "./household";
import { publicRouter } from "./public";
import { redemptionsRouter } from "./redemptions";
import { merchantRouter } from "./merchant";
import { loyaltyRouter } from "./loyalty";
import { activityRouter } from "./activity";
import { adminRouter } from "./admin";

/** Mounts every API router and returns the HTTP server for Vite's HMR and listen(). */
export function registerRoutes(app: Express): Server {
  app.use(authRouter);
  app.use(profileRouter);
  app.use(householdRouter);
  app.use(publicRouter);
  app.use(redemptionsRouter);
  app.use(merchantRouter);
  app.use(loyaltyRouter);
  app.use(activityRouter);
  app.use(adminRouter);

  // Unknown API paths get a JSON 404 rather than the client's index.html.
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  return createServer(app);
}
