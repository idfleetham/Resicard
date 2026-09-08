import { Router } from "express";
import { config } from "../config";
import { runDailyJobs } from "../lib/jobs";
import { asyncHandler, notFound, forbidden } from "../lib/http";

export const jobsRouter = Router();

/**
 * The daily reminders, for a scheduled deployment or any cron service that can
 * make an HTTP call. Idempotent, so a service that retries or fires twice costs
 * nothing. Closed entirely until JOBS_SECRET is set, rather than open with a
 * guessable default.
 */
jobsRouter.post(
  "/api/jobs/daily",
  asyncHandler(async (req, res) => {
    if (!config.jobsSecret) throw notFound("Jobs are not enabled");
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (token !== config.jobsSecret) throw forbidden("Invalid jobs token");
    res.json(await runDailyJobs());
  }),
);
