import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LoyaltyReward } from "@shared/schema";

/** One entry of GET /api/loyalty/mine. */
export interface LoyaltyMembership {
  merchant: { id: string; name: string; logoUrl: string | null };
  points: number;
  stamps: number;
  tier: { name: string; color: string | null; discountPercent: number | null } | null;
  nextTier: { name: string; thresholdPoints: number } | null;
  tiers: { id: string; name: string; thresholdPoints: number; color: string | null }[];
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

function hintFor(m: LoyaltyMembership): string {
  if (m.nextReward) return `${m.nextReward.pointsToGo} to ${m.nextReward.name}`;
  if (m.rewards.length === 0) return "Nothing to collect yet";
  if (m.claimable.length > 0) return "Ready to claim";
  return "Keep collecting";
}

function costLabel(r: LoyaltyReward): string {
  const parts: string[] = [];
  if (r.costPoints) parts.push(`${r.costPoints} points`);
  if (r.costStamps) parts.push(`${r.costStamps} stamps`);
  return parts.join(" + ") || "Free";
}

function PointsRow({ membership }: { membership: LoyaltyMembership }) {
  const [open, setOpen] = useState(false);
  const { merchant, points, stamps, tier, tiers, rewards, claimable } = membership;
  const claimableIds = new Set(claimable.map((r) => r.id));

  return (
    <li className="bg-white rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <OutletBadge name={merchant.name} logoUrl={merchant.logoUrl} />
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate">{merchant.name}</p>
          <p className="text-xs text-slate-brand truncate">{hintFor(membership)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display font-extrabold text-2xl leading-none tracking-[-0.02em] tabular-nums">
            {stamps > 0 && !points ? stamps : points}
          </p>
          {tier ? (
            <p className="text-xs text-slate-brand mt-1 flex items-center justify-end gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tier.color ?? "#0F3B47" }} />
              {tier.name}
            </p>
          ) : (
            <p className="text-xs text-slate-brand mt-1">{stamps > 0 && !points ? "stamps" : "points"}</p>
          )}
        </div>
        <ChevronDown className={`h-5 w-5 text-slate-brand shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[#E6E9E8] space-y-4 text-sm">
          {tiers.length > 0 && (
            <div className="pt-3">
              <p className="text-xs font-semibold text-slate-brand mb-2">Tiers</p>
              <ul className="space-y-1.5">
                {tiers.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: t.color ?? "#0F3B47" }} />
                    <span className={t.name === tier?.name ? "font-bold" : ""}>{t.name}</span>
                    <span className="ml-auto text-slate-brand tabular-nums">{t.thresholdPoints} points</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className={tiers.length > 0 ? "" : "pt-3"}>
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
                    {claimableIds.has(r.id) ? (
                      <span className="text-[11px] font-bold tracking-[0.06em] uppercase px-2.5 py-1 rounded-full bg-sea text-foam">Ready</span>
                    ) : (
                      <span className="text-[11px] font-bold tracking-[0.06em] uppercase px-2.5 py-1 rounded-full bg-foam text-slate-brand">Not yet</span>
                    )}
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
