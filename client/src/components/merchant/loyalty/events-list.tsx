import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTime } from "@/components/resident/format";
import { EVENT_LABELS, type LoyaltyEventRow } from "./types";

function detail(e: LoyaltyEventRow): string {
  const m = e.metadata ?? {};
  if (e.type === "tier_change" && typeof m.tierName === "string") return `Now ${m.tierName}`;
  if (e.type === "redeem_reward" && typeof m.rewardName === "string") return m.rewardName;
  if (e.type === "adjust" && typeof m.reason === "string") return m.reason;
  return "";
}

export default function EventsList() {
  const { data: events = [], isLoading } = useQuery<LoyaltyEventRow[]>({ queryKey: ["/api/loyalty/events?limit=30"] });

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">Recent activity</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}</div>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[28rem] overflow-y-auto">
            {events.map((e) => {
              const signed = e.amount === null || e.amount === undefined ? "" : e.amount > 0 ? `+${e.amount}` : String(e.amount);
              return (
                <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900">
                      <span className="font-medium">{e.customerAlias}</span> · {EVENT_LABELS[e.type] ?? e.type}
                      {detail(e) && <span className="text-slate-500"> · {detail(e)}</span>}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(e.createdAt)} {formatTime(e.createdAt)}</p>
                  </div>
                  {signed && (
                    <span className={`font-semibold ${e.amount && e.amount < 0 ? "text-red-600" : "text-green-700"}`}>{signed}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
