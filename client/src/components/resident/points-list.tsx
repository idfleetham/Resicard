import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import type { LoyaltyReward } from "@shared/schema";
import { Button } from "@/components/ui/button";

/** A tier benefit as returned by GET /api/loyalty/mine: a reward plus its claim state. */
export interface TierBenefit extends LoyaltyReward {
  claimable: boolean;
  nextClaimAt: string | null;
}

/** One entry of GET /api/loyalty/mine. */
export interface LoyaltyMembership {
  merchant: { id: string; name: string; logoUrl: string | null };
  cardTheme: string;
  cardPattern: string;
  points: number;
  statusPoints: number;
  tierWindowDays: number;
  tier: { name: string; color: string | null; discountPercent: number | null } | null;
  tierDiscountPercent: number | null;
  nextTier: { name: string; thresholdPoints: number } | null;
  tiers: { id: string; name: string; thresholdPoints: number; color: string | null; discountPercent: number | null }[];
  benefits: TierBenefit[];
  rewards: LoyaltyReward[];
  claimable: LoyaltyReward[];
  nextReward: { id: string; name: string; costPoints: number; pointsToGo: number } | null;
  lastActivityAt: string;
}

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

export function OutletBadge({ name, logoUrl, size = "h-10 w-10" }: { name: string; logoUrl: string | null; size?: string }) {
  if (logoUrl) return <img src={logoUrl} alt="" className={`${size} rounded-xl object-cover shrink-0`} />;
  return (
    <div className={`${size} rounded-xl bg-sand text-sea flex items-center justify-center font-display font-extrabold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/** "12 months", "30 days" for the tier window. */
export function windowLabel(days: number): string {
  if (days >= 60 && days % 30 === 0) return `${days / 30} months`;
  if (days >= 60) return `${Math.round(days / 30)} months`;
  return `${days} days`;
}

/** Tier line: "Gold · 325 pts in the last 12 months". */
export function tierLine(m: Pick<LoyaltyMembership, "tier" | "statusPoints" | "tierWindowDays">): string {
  return `${m.tier?.name ?? "No tier yet"} · ${m.statusPoints} pts in the last ${windowLabel(m.tierWindowDays)}`;
}

/** 0..1 progress towards the next points reward, or null when there is none. */
function progressFor(m: LoyaltyMembership): number | null {
  if (!m.nextReward || m.nextReward.costPoints <= 0) return null;
  return Math.max(0, Math.min(1, m.points / m.nextReward.costPoints));
}

function hintFor(m: LoyaltyMembership): string {
  if (m.benefits.some((b) => b.claimable)) return "Benefit ready to claim";
  if (m.nextReward) return `${m.nextReward.pointsToGo} to ${m.nextReward.name}`;
  if (m.rewards.length === 0 && m.benefits.length === 0) return "Nothing to collect yet";
  if (m.claimable.length > 0) return "Ready to claim";
  return "Keep collecting";
}

function costLabel(r: LoyaltyReward): string {
  return r.costPoints ? `${r.costPoints} points` : "Free";
}

/** "dd Mon" for a next-claim date. */
function shortDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/** The claim state of a tier benefit: "Claim", or "Claimed this month" with "Available from 01 Oct". */
export function benefitState(b: TierBenefit): { label: string; next: string | null } {
  if (b.claimable) return { label: "Claim", next: null };
  if (b.nextClaimAt) {
    const when = b.claimRule === "weekly" ? "this week" : "this month";
    return { label: `Claimed ${when}`, next: `Available from ${shortDate(b.nextClaimAt)}` };
  }
  return { label: "Claimed", next: null };
}

const PILL_ON = "text-[11px] font-bold tracking-[0.06em] uppercase px-2.5 py-1 rounded-full bg-sea text-foam";
const PILL_OFF = "text-[11px] font-bold tracking-[0.06em] uppercase px-2.5 py-1 rounded-full bg-foam text-slate-brand";

function PointsRow({ membership }: { membership: LoyaltyMembership }) {
  const [open, setOpen] = useState(false);
  const { merchant, points, tier, tiers, benefits, rewards, claimable } = membership;
  const claimableIds = new Set(claimable.map((r) => r.id));

  return (
    <li className="bg-white rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <OutletBadge name={merchant.name} logoUrl={merchant.logoUrl} size="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-lg leading-tight truncate tracking-[-0.01em]">{merchant.name}</p>
          <p className="text-xs text-slate-brand truncate mt-0.5">{hintFor(membership)}</p>
          {progressFor(membership) !== null && (
            <div className="mt-2 h-1.5 rounded-full bg-sand overflow-hidden">
              <div className="h-full rounded-full bg-sea" style={{ width: `${Math.round((progressFor(membership) ?? 0) * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <div className="bg-sea text-foam rounded-xl px-3 py-1.5 min-w-[64px] text-center">
            <p className="font-display font-extrabold text-2xl leading-none tracking-[-0.02em] tabular-nums">
              {points}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] font-bold opacity-80 mt-0.5">points</p>
          </div>
          {tier && (
            <p className="text-xs font-bold text-sea flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tier.color ?? "#E4572E" }} />
              {tier.name}
            </p>
          )}
        </div>
        <ChevronDown className={`h-5 w-5 text-slate-brand shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-[#E6E9E8] space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-brand">{tierLine(membership)}</p>
            <Button asChild variant="outline" size="sm" className="h-9 px-4 bg-white shrink-0">
              <Link href={`/loyalty/${merchant.id}`}>Show card</Link>
            </Button>
          </div>

          {tiers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-brand mb-2">Tiers</p>
              <ul className="space-y-1.5">
                {tiers.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: t.color ?? "#0F3B47" }} />
                    <span className={t.name === tier?.name ? "font-bold" : ""}>{t.name}</span>
                    {t.discountPercent ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-buoy text-white">{t.discountPercent}% off</span>
                    ) : null}
                    <span className="ml-auto text-slate-brand tabular-nums">{t.thresholdPoints} points</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {benefits.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-brand mb-2">Tier benefits</p>
              <ul className="space-y-2">
                {benefits.map((b) => (
                  <li key={b.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{b.name}</p>
                      <p className="text-xs text-slate-brand">{tiers.find((t) => t.id === b.tierId)?.name ?? "Tier"} benefit</p>
                    </div>
                    {b.claimable ? (
                      <Button asChild size="sm" className="h-9 px-4">
                        <Link href={`/loyalty/${merchant.id}`}>Claim</Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-brand text-right">
                        {benefitState(b).label}
                        {benefitState(b).next && <span className="block">{benefitState(b).next}</span>}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-brand mb-2">Rewards</p>
            {rewards.length === 0 ? (
              <p className="text-slate-brand">This outlet has not added any rewards yet.</p>
            ) : (
              <ul className="space-y-2">
                {rewards.map((r) => (
                  <li key={r.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{r.name}</p>
                      <p className="text-xs text-slate-brand">{costLabel(r)}</p>
                    </div>
                    <span className={claimableIds.has(r.id) ? PILL_ON : PILL_OFF}>{claimableIds.has(r.id) ? "Ready" : "Not yet"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function PointsList({ items }: { items: LoyaltyMembership[] }) {
  const [showOlder, setShowOlder] = useState(false);
  const cutoff = Date.now() - TWELVE_MONTHS_MS;
  const recent = items.filter((m) => new Date(m.lastActivityAt).getTime() >= cutoff);
  const older = items.filter((m) => new Date(m.lastActivityAt).getTime() < cutoff);

  return (
    <div className="space-y-3">
      {recent.length > 0 && (
        <ul className="flex flex-col gap-3">
          {recent.map((m) => (
            <PointsRow key={m.merchant.id} membership={m} />
          ))}
        </ul>
      )}
      {older.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowOlder((o) => !o)}
            className="text-sm font-bold text-slate-brand underline-offset-4 hover:underline"
          >
            {showOlder ? "Hide older" : `Older (${older.length})`}
          </button>
          {showOlder && (
            <ul className="flex flex-col gap-3">
              {older.map((m) => (
                <PointsRow key={m.merchant.id} membership={m} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
