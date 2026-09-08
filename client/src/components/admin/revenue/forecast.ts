import type { RevenueFees, RevenueReport } from "./types";

/**
 * Forecast maths for the revenue chart. Pure: takes the server's schedule plus the
 * admin's assumptions and returns 12 future months. For each month m:
 *   residents = expiring(m) x renewalRate x fee (by plan) + newResidents x individual fee
 *   merchants = premiumCount(m) x monthly fee, where
 *   premiumCount(m) = premiumCount(m - 1) x (1 - churn) + newMerchants
 * Counts carry forward from month to month. The first `skip` months of the schedule
 * (the current month, already shown as actual) are left out. Nothing here is saved.
 */

export interface ForecastAssumptions {
  /** 0 to 100: share of expiring residents who renew. */
  residentRenewalRate: number;
  /** 0 to 20: share of premium merchants lost each month. */
  merchantMonthlyChurn: number;
  newResidentsPerMonth: number;
  newMerchantsPerMonth: number;
}

export const DEFAULT_ASSUMPTIONS: ForecastAssumptions = {
  residentRenewalRate: 70,
  merchantMonthlyChurn: 5,
  newResidentsPerMonth: 0,
  newMerchantsPerMonth: 0,
};

export interface ForecastMonth {
  month: string;
  residents: number;
  merchants: number;
  total: number;
  premiumMerchants: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildForecast(schedule: RevenueReport["schedule"], fees: RevenueFees, a: ForecastAssumptions, months = 12, skip = 1): ForecastMonth[] {
  const renewal = Math.min(Math.max(a.residentRenewalRate, 0), 100) / 100;
  const churn = Math.min(Math.max(a.merchantMonthlyChurn, 0), 100) / 100;
  const newResidents = Math.max(0, a.newResidentsPerMonth || 0);
  const newMerchants = Math.max(0, a.newMerchantsPerMonth || 0);

  let premiumCount = schedule.premiumMerchants;
  const out: ForecastMonth[] = [];
  for (const expiring of schedule.residentExpiries.slice(skip, skip + months)) {
    premiumCount = premiumCount * (1 - churn) + newMerchants;
    const renewed = expiring.individual * renewal * fees.individual + expiring.household * renewal * fees.household;
    const residents = round2(renewed + newResidents * fees.individual);
    const merchants = round2(premiumCount * fees.merchantPremiumMonthly);
    out.push({ month: expiring.month, residents, merchants, total: round2(residents + merchants), premiumMerchants: round2(premiumCount) });
  }
  return out;
}
