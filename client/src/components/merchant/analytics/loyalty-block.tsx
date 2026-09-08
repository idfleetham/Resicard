import { SectionTitle } from "../portal-ui";
import { percent, type LoyaltyBlockData } from "./types";

/**
 * The loyalty programme in one card: four tiles and the tier split. Tiers are an
 * ordered scale, so they read as one segmented bar; each segment is directly
 * labelled beneath it, so a reader never has to tell two tier colours apart.
 */

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-foam p-4">
      <p className="text-xs text-slate-brand">{label}</p>
      <p className="font-display font-extrabold text-[28px] leading-none tracking-[-0.03em] text-sea mt-2">
        {value.toLocaleString("en-GB")}
      </p>
    </div>
  );
}

export default function LoyaltyBlock({ loyalty }: { loyalty: LoyaltyBlockData }) {
  const total = loyalty.tiers.reduce((sum, t) => sum + t.members, 0);

  return (
    <div className="bg-white rounded-2xl p-5">
      <SectionTitle>Loyalty</SectionTitle>
      <p className="text-xs text-slate-brand mt-1 mb-4">Members, and what they have done in the last 30 days.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Members" value={loyalty.members} />
        <Tile label="Active in 30 days" value={loyalty.activeMembers30d} />
        <Tile label="Points issued" value={loyalty.pointsIssued30d} />
        <Tile label="Rewards claimed" value={loyalty.rewardsClaimed30d} />
      </div>

      {loyalty.tiers.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-brand mb-2">Tiers</p>
          {total === 0 ? (
            <p className="text-sm text-slate-brand">Nobody has reached a tier yet.</p>
          ) : (
            <>
              <div className="flex h-3 rounded-full overflow-hidden gap-[2px]" role="presentation">
                {loyalty.tiers.map((tier) => (
                  <div
                    key={tier.name}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${(tier.members / total) * 100}%`, backgroundColor: tier.color }}
                  />
                ))}
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {loyalty.tiers.map((tier) => (
                  <div key={tier.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                    <dt className="text-sm text-sea">{tier.name}</dt>
                    <dd className="text-sm text-slate-brand">
                      {tier.members} · {percent(tier.members / total)}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      )}
    </div>
  );
}
