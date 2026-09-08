import { useQuery } from "@tanstack/react-query";
import { ClaimStrip } from "@/components/resident/claim-strip";
import { PointsList, type LoyaltyMembership } from "@/components/resident/points-list";
import { ActivityFeed, type ActivityItem } from "@/components/resident/activity-feed";

function EmptyNote({ children }: { children: string }) {
  return <div className="bg-sand rounded-2xl p-5 text-sm text-sea">{children}</div>;
}

/** A sea strip with the totals, so the tab opens on something with some weight to it. */
function PointsSummary({ items }: { items: LoyaltyMembership[] }) {
  const points = items.reduce((n, m) => n + m.points, 0);
  const ready = items.reduce((n, m) => n + m.claimable.length + m.benefits.filter((b) => b.claimable).length, 0);
  const tiers = items.filter((m) => m.tier).length;
  const cell = "flex flex-col gap-0.5";
  const num = "font-display font-extrabold text-3xl leading-none tracking-[-0.03em] tabular-nums";
  const label = "text-[11px] uppercase tracking-[0.12em] font-bold opacity-75";
  return (
    <div className="bg-sea text-foam rounded-2xl p-5 grid grid-cols-3 gap-3">
      <div className={cell}><span className={num}>{points}</span><span className={label}>points</span></div>
      <div className={cell}><span className={num}>{items.length}</span><span className={label}>{items.length === 1 ? "outlet" : "outlets"}</span></div>
      <div className={cell}><span className={`${num} ${ready > 0 ? "text-buoy" : ""}`}>{ready}</span><span className={label}>ready</span></div>
      {tiers > 0 && <p className="col-span-3 text-xs opacity-80 mt-1">Tier status at {tiers} {tiers === 1 ? "outlet" : "outlets"}. Points are kept on Free.</p>}
    </div>
  );
}

function Placeholder() {
  return <div className="bg-white rounded-2xl p-5 animate-pulse h-20" />;
}

/**
 * Resident "Activity" tab: what can I claim right now, how close am I at the
 * places I go, and what has happened lately.
 */
export default function ActivityTab() {
  const loyalty = useQuery<LoyaltyMembership[]>({ queryKey: ["/api/loyalty/mine"] });
  const feed = useQuery<ActivityItem[]>({ queryKey: ["/api/activity/mine"] });
  const memberships = loyalty.data ?? [];

  return (
    <div className="space-y-8 text-sea">
      <ClaimStrip items={memberships} />

      {memberships.length > 0 && <PointsSummary items={memberships} />}

      <section className="space-y-3">
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Your points</h2>
        {loyalty.isLoading ? (
          <Placeholder />
        ) : memberships.length === 0 ? (
          <EmptyNote>Points appear here after your first redemption at an outlet that runs a programme.</EmptyNote>
        ) : (
          <PointsList items={memberships} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Activity</h2>
        {feed.isLoading ? (
          <Placeholder />
        ) : !feed.data || feed.data.length === 0 ? (
          <EmptyNote>Nothing here yet. Scan the Resicard code at an outlet to use your first offer.</EmptyNote>
        ) : (
          <ActivityFeed items={feed.data} />
        )}
      </section>
    </div>
  );
}
