/**
 * FICTIONAL DATA. Every name, figure and offer below is invented.
 *
 * It exists so a merchant on Free — and anyone reading the public pricing page —
 * can see exactly what the Insight analytics screen looks like before paying for
 * it, without us ever showing one real outlet's trade to another. "The Salted Oar"
 * is not a real pub, in St Andrews or anywhere else, and no figure here is taken
 * from a real Resicard outlet. Anywhere this dataset is rendered, the dashboard
 * carries a visible "Example data" banner.
 *
 * The numbers are shaped like a steady small-town pub over 90 days: 428
 * redemptions from 165 residents, a Thursday and Sunday skew, an evening peak
 * between 6 and 8pm, and a three-tier loyalty programme. Every total is internally
 * consistent — byWeek, byDay, byHour and byOffer each sum to the headline 428, and
 * each demographic block sums to 1 across the residents who answered it.
 */

import type { AnalyticsData } from "./types";

export const EXAMPLE_ANALYTICS: AnalyticsData = {
  range: { from: "2026-06-10T00:00:00.000Z", to: "2026-09-08T00:00:00.000Z" },

  headline: {
    redemptions: 428,
    redemptionsPrevious: 361,
    residents: 165,
    newResidents: 96,
    returningShare: 0.776,
    favourites: 74,
    averageBasket: 26.4,
  },

  byWeek: [
    { weekStart: "2026-06-15", redemptions: 26, newResidents: 16 },
    { weekStart: "2026-06-22", redemptions: 28, newResidents: 12 },
    { weekStart: "2026-06-29", redemptions: 25, newResidents: 9 },
    { weekStart: "2026-07-06", redemptions: 30, newResidents: 8 },
    { weekStart: "2026-07-13", redemptions: 33, newResidents: 7 },
    { weekStart: "2026-07-20", redemptions: 31, newResidents: 6 },
    { weekStart: "2026-07-27", redemptions: 29, newResidents: 5 },
    { weekStart: "2026-08-03", redemptions: 36, newResidents: 6 },
    { weekStart: "2026-08-10", redemptions: 34, newResidents: 4 },
    { weekStart: "2026-08-17", redemptions: 38, newResidents: 7 },
    { weekStart: "2026-08-24", redemptions: 37, newResidents: 5 },
    { weekStart: "2026-08-31", redemptions: 40, newResidents: 6 },
    { weekStart: "2026-09-07", redemptions: 41, newResidents: 5 },
  ],

  byDay: [
    { day: "mon", redemptions: 38 },
    { day: "tue", redemptions: 34 },
    { day: "wed", redemptions: 41 },
    { day: "thu", redemptions: 88 },
    { day: "fri", redemptions: 62 },
    { day: "sat", redemptions: 58 },
    { day: "sun", redemptions: 107 },
  ],

  byHour: [
    { hour: 0, redemptions: 0 },
    { hour: 1, redemptions: 0 },
    { hour: 2, redemptions: 0 },
    { hour: 3, redemptions: 0 },
    { hour: 4, redemptions: 0 },
    { hour: 5, redemptions: 0 },
    { hour: 6, redemptions: 0 },
    { hour: 7, redemptions: 0 },
    { hour: 8, redemptions: 0 },
    { hour: 9, redemptions: 0 },
    { hour: 10, redemptions: 0 },
    { hour: 11, redemptions: 4 },
    { hour: 12, redemptions: 26 },
    { hour: 13, redemptions: 34 },
    { hour: 14, redemptions: 12 },
    { hour: 15, redemptions: 8 },
    { hour: 16, redemptions: 14 },
    { hour: 17, redemptions: 38 },
    { hour: 18, redemptions: 74 },
    { hour: 19, redemptions: 81 },
    { hour: 20, redemptions: 63 },
    { hour: 21, redemptions: 41 },
    { hour: 22, redemptions: 24 },
    { hour: 23, redemptions: 9 },
  ],

  byOffer: [
    { offerId: "example-offer-1", title: "20% off food, Sunday to Thursday", headline: "20% off", redemptions: 171, share: 0.4 },
    { offerId: "example-offer-2", title: "Two for one on mains before 6pm", headline: "2 for 1", redemptions: 118, share: 0.276 },
    { offerId: "example-offer-3", title: "Free coffee with any breakfast", headline: "Free item", redemptions: 86, share: 0.201 },
    { offerId: "example-offer-4", title: "£15 Sunday roast", headline: "£15", redemptions: 53, share: 0.124 },
  ],

  loyalty: {
    members: 148,
    activeMembers30d: 62,
    pointsIssued30d: 4820,
    rewardsClaimed30d: 31,
    tiers: [
      { name: "Harbour", color: "#0F3B47", members: 96 },
      { name: "Skipper", color: "#5C6F75", members: 38 },
      { name: "Lighthouse", color: "#E4572E", members: 14 },
    ],
  },

  // 165 residents redeemed; 128 gave an age band and 121 gave a sex. The 18-24
  // band and "other" are shown folded away, so the example shows what suppression
  // looks like rather than pretending everyone can be reported.
  demographics: {
    ageBands: [
      { band: "25-34", share: 0.234 },
      { band: "35-44", share: 0.281 },
      { band: "45-54", share: 0.211 },
      { band: "55-64", share: 0.156 },
      { band: "65+", share: 0.086 },
      { band: "not shown", share: 0.032 },
    ],
    sex: [
      { value: "female", share: 0.512 },
      { value: "male", share: 0.421 },
      { value: "prefer_not_to_say", share: 0.041 },
      { value: "not shown", share: 0.026 },
    ],
  },

  town: {
    categoryLabel: "Pubs",
    outletsInCategory: 9,
    yourRedemptions30d: 151,
    medianRedemptions30d: 118,
    busiestDays: [
      { day: "thu", share: 0.19 },
      { day: "fri", share: 0.18 },
      { day: "sat", share: 0.17 },
      { day: "sun", share: 0.16 },
      { day: "wed", share: 0.12 },
      { day: "mon", share: 0.09 },
      { day: "tue", share: 0.09 },
    ],
    memberGrowth: [
      { month: "2025-10", members: 318 },
      { month: "2025-11", members: 352 },
      { month: "2025-12", members: 407 },
      { month: "2026-01", members: 441 },
      { month: "2026-02", members: 468 },
      { month: "2026-03", members: 512 },
      { month: "2026-04", members: 559 },
      { month: "2026-05", members: 604 },
      { month: "2026-06", members: 651 },
      { month: "2026-07", members: 688 },
      { month: "2026-08", members: 724 },
      { month: "2026-09", members: 749 },
    ],
  },
};

/** The invented outlet this example dataset belongs to. */
export const EXAMPLE_OUTLET_NAME = "The Salted Oar";
