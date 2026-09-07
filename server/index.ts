import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { config } from "./config";
import { registerRoutes } from "./routes";
import { registerStripeWebhook } from "./lib/stripe";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// The Stripe webhook needs the raw body for signature checks, so it is mounted before the JSON parser.
registerStripeWebhook(app);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// One line per API request: method, path, status and duration.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }
  const start = Date.now();
  const path = req.originalUrl.split("?")[0];
  res.on("finish", () => {
    log(`${req.method} ${path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

interface ErrorLike {
  status?: number;
  statusCode?: number;
  message?: string;
  type?: string;
}

(async () => {
  const server = registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = (err ?? {}) as ErrorLike;
    let status = e.status ?? e.statusCode ?? 500;
    let message = e.message ?? "Internal server error";
    if (e.type === "entity.parse.failed") {
      status = 400;
      message = "Malformed JSON body";
    } else if (e.type === "entity.too.large") {
      status = 413;
      message = "Request body too large";
    }
    if (status >= 500) {
      console.error(err);
      if (config.isProduction) message = "Internal server error";
    }
    if (res.headersSent) return;
    res.status(status).json({ message });
  });

  // Vite (development) or the built client (production) is mounted last so its
  // catch-all does not shadow the API.
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    const builtPath = path.resolve(import.meta.dirname, "..", "dist", "public");
    if (fs.existsSync(builtPath)) {
      app.use(express.static(builtPath));
      app.use("*", (_req, res) => res.sendFile(path.join(builtPath, "index.html")));
    } else {
      log(`Built client not found at ${builtPath}; falling back to the legacy location`);
      serveStatic(app);
    }
  }

  server.listen({ port: config.port, host: "0.0.0.0" }, () => {
    log(`serving on port ${config.port}`);
  });
})();
