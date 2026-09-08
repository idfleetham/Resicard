/**
 * The public face of the analytics folder. The merchant portal and the public
 * pricing page both import from here, so they render the same dashboard from the
 * same types — one with real data, one with the example dataset.
 */
export { default as AnalyticsDashboard } from "./dashboard";
export { EXAMPLE_ANALYTICS, EXAMPLE_OUTLET_NAME } from "./example-data";
export type { AnalyticsData, AnalyticsHeadline, DayKey, LoyaltyBlockData, TownBlockData } from "./types";
