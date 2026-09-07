import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/components/resident/format";
import type { LoyaltyAnalytics } from "./types";

function Tile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value ?? "-"}</p>
    </div>
  );
}

export default function AnalyticsBlock() {
  const { data, isLoading } = useQuery<LoyaltyAnalytics>({ queryKey: ["/api/loyalty/analytics"] });
  const weeks = (data?.byWeek ?? []).map((w) => ({
    ...w,
    label: new Date(w.weekStart).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
  }));

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">Last 30 days</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-40 bg-slate-100 rounded animate-pulse" />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Tile label="Members" value={data?.members} />
              <Tile label="Active members" value={data?.activeMembers30d} />
              <Tile label="Points issued" value={data?.pointsIssued30d} />
              <Tile label="Rewards redeemed" value={data?.rewardsRedeemed30d} />
              <Tile label="Redemptions" value={data?.redemptions30d} />
            </div>
            {weeks.length > 0 && (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeks} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name === "redemptions" ? "Redemptions" : "Points issued"]}
                      labelFormatter={(_label, payload) => {
                        const start = payload?.[0]?.payload?.weekStart as string | undefined;
                        return start ? `Week of ${formatDate(start)}` : "";
                      }}
                    />
                    <Bar dataKey="redemptions" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pointsIssued" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {weeks.length > 0 && (
              <div className="flex gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-blue-600" /> Redemptions</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-blue-300" /> Points issued</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
