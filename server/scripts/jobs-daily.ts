// Sends the day's membership reminders. Usage: npm run jobs:daily
// Idempotent, so running it more than once a day sends nothing extra.
import { pool } from "../db";
import { runDailyJobs } from "../lib/jobs";

async function main(): Promise<void> {
  const summary = await runDailyJobs();
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
