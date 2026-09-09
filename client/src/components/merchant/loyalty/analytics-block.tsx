import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "@/components/resident/format";
import { SectionTitle } from "../portal-ui";
import type { LoyaltyAnalytics } from "./types";

const SEA = "#0F3B47";
const SAND = "#E6D9BF";
const LINE = "#E6E9E8";
const SLATE = "#5C6F75";

function Tile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-2xl bg-foam p-4">
      <p className="text-xs text-slate-brand">{label}</p>
      <p className="font-display font-extrabold text-[32px] leading-none tracking-[-0.03em] text-sea mt-2">{value ?? "-"}</p>
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
    <div className="bg-white rounded-2xl border border-hairline p-5 space-y-4">
      <SectionTitle>Last 30 days</SectionTitle>
      {isLoading ? (
        <div className="h-40 bg-foam rounded-2xl animate-pulse" />
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
                <BarChart data={weeks} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid stroke={LINE} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: SLATE }} axisLine={{ stroke: LINE }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: SLATE }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "#F2F5F4" }}
                    contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12, color: SEA }}
                    formatter={(value: number, name: string) => [value, name === "redemptions" ? "Redemptions" : "Points issued"]}
                    labelFormatter={(_label, payload) => {
                      const start = payload?.[0]?.payload?.weekStart as string | undefined;
                      return start ? `Week of ${formatDate(start)}` : "";
                    }}
                  />
                  <Bar dataKey="redemptions" fill={SEA} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pointsIssued" fill={SAND} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {weeks.length > 0 && (
            <div className="flex gap-4 text-xs text-slate-brand">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sea" /> Redemptions</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sand" /> Points issued</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
