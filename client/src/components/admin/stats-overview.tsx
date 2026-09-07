import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      {(data?.pendingDocuments || data?.pendingMerchants) ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="flex-1 text-amber-900">
              Waiting for you:{" "}
              {data.pendingDocuments ? `${data.pendingDocuments} residency check${data.pendingDocuments === 1 ? "" : "s"}` : ""}
              {data.pendingDocuments && data.pendingMerchants ? " and " : ""}
              {data.pendingMerchants ? `${data.pendingMerchants} business application${data.pendingMerchants === 1 ? "" : "s"}` : ""}.
            </p>
            <div className="flex gap-2">
              {data.pendingDocuments ? <Button className="h-11" onClick={() => onGoTo("documents")}>Residency checks</Button> : null}
              {data.pendingMerchants ? <Button variant="outline" className="h-11" onClick={() => onGoTo("merchants")}>Businesses</Button> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {TILES.map((t) => (
          <Card key={t.key}>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">{t.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{isLoading ? "-" : data?.[t.key] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
