import { useQuery } from "@tanstack/react-query";
import { ClaimStrip } from "@/components/resident/claim-strip";
import { PointsList, type LoyaltyMembership } from "@/components/resident/points-list";
import { ActivityFeed, type ActivityItem } from "@/components/resident/activity-feed";

function EmptyNote({ children }: { children: string }) {
  return <div className="bg-sand rounded-2xl p-5 text-sm text-sea">{children}</div>;
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
