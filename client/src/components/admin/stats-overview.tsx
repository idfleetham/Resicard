import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/merchant/portal-ui";
import type { AdminStats } from "./types";

const TILES: { key: keyof AdminStats; label: string }[] = [
  { key: "residents", label: "Residents" },
  { key: "verifiedResidents", label: "Verified residents" },
  { key: "activeMembers", label: "Active members" },
  { key: "merchants", label: "Businesses" },
  { key: "offers", label: "Offers" },
  { key: "redemptionsThisMonth", label: "Redemptions this month" },
];

export default function StatsOverview({ onGoTo }: { onGoTo: (tab: string) => void }) {
  const { data, isLoading } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });

  return (
    <div className="space-y-5">
      {(data?.postcardsToPost || data?.pendingMerchants) ? (
        <div className="bg-sand rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="flex-1 text-sea">
            <span className="font-bold">Waiting for you: </span>
            {data.postcardsToPost ? `${data.postcardsToPost} postcard${data.postcardsToPost === 1 ? "" : "s"} to post` : ""}
            {data.postcardsToPost && data.pendingMerchants ? " and " : ""}
            {data.pendingMerchants ? `${data.pendingMerchants} business application${data.pendingMerchants === 1 ? "" : "s"}` : ""}.
          </p>
          <div className="flex gap-2">
            {data.postcardsToPost ? <Button variant="buoy" className="h-12 px-6" onClick={() => onGoTo("postcards")}>Postcards</Button> : null}
            {data.pendingMerchants ? <Button variant="outline" className="h-12 px-6 bg-white" onClick={() => onGoTo("merchants")}>Businesses</Button> : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {TILES.map((t) => (
          <Tile key={t.key} label={t.label} value={isLoading ? "-" : data?.[t.key] ?? 0} />
        ))}
      </div>
    </div>
  );
}
