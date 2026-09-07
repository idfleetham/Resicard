import { useQuery } from "@tanstack/react-query";
import { formatDate, formatTime } from "@/components/resident/format";
import { EVENT_LABELS, type LoyaltyEventRow } from "./types";
import { SectionTitle } from "../portal-ui";

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
    <div className="bg-white rounded-2xl p-5">
      <SectionTitle className="mb-3">Recent activity</SectionTitle>
      {isLoading ? (
        <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-brand">Nothing yet.</p>
      ) : (
        <ul className="divide-y divide-[#E6E9E8] max-h-[28rem] overflow-y-auto">
          {events.map((e) => {
            const signed = e.amount === null || e.amount === undefined ? "" : e.amount > 0 ? `+${e.amount}` : String(e.amount);
            return (
              <li key={e.id} className="flex items-center gap-3 min-h-12 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sea">
                    <span className="font-bold">{e.customerAlias}</span> · {EVENT_LABELS[e.type] ?? e.type}
                    {detail(e) && <span className="text-slate-brand"> · {detail(e)}</span>}
                  </p>
                  <p className="text-xs text-slate-brand">{formatDate(e.createdAt)} {formatTime(e.createdAt)}</p>
                </div>
                {signed && (
                  <span className={`font-display font-extrabold text-lg ${e.amount && e.amount < 0 ? "text-[#B5321A]" : "text-[#1F8A5B]"}`}>{signed}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
