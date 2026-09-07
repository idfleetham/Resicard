import { Link } from "wouter";
import { formatTime } from "@/components/resident/format";

interface FeedMerchant {
  id: string;
  name: string;
  logoUrl: string | null;
}

/** One entry of GET /api/activity/mine. */
export type ActivityItem =
  | { kind: "redemption"; id: string; at: string; merchant: FeedMerchant; title: string; code: string; pointsAwarded: number }
  | { kind: "points" | "reward" | "tier"; id: string; at: string; merchant: FeedMerchant; title: string; amount: number | null };

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today", "Yesterday", then "dd Mon" (with the year when it is not this year). */
export function dayHeading(value: string, now: Date = new Date()): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: sameYear ? undefined : "numeric" });
}

function groupByDay(items: ActivityItem[]): { heading: string; items: ActivityItem[] }[] {
  const groups: { heading: string; items: ActivityItem[] }[] = [];
  for (const item of items) {
    const heading = dayHeading(item.at);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.items.push(item);
    else groups.push({ heading, items: [item] });
  }
  return groups;
}

function amountLabel(item: ActivityItem): string {
  if (item.kind === "redemption") return item.pointsAwarded > 0 ? `+${item.pointsAwarded} pts` : "";
  if (item.kind === "tier" || item.amount === null || item.amount === 0) return "";
  return item.amount > 0 ? `+${item.amount}` : `${item.amount}`;
}

function FeedLine({ item }: { item: ActivityItem }) {
  const body = (
    <>
      <span className="text-xs text-slate-brand tabular-nums w-11 shrink-0">{formatTime(item.at)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold truncate">{item.title}</span>
        <span className="block text-xs text-slate-brand truncate">{item.merchant.name}</span>
      </span>
      {item.kind === "redemption" ? (
        <span className="font-display font-extrabold text-sm tracking-[0.08em] shrink-0">{item.code}</span>
      ) : (
        <span className="text-sm font-bold tabular-nums shrink-0">{amountLabel(item)}</span>
      )}
    </>
  );
  const cls = "flex items-center gap-3 px-4 py-3";
  if (item.kind === "redemption") {
    return (
      <Link href={`/redemptions/${item.id}`} className={`${cls} transition-colors hover:bg-[#FAFBFB] active:bg-foam`}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="space-y-4">
      {groupByDay(items).map((group) => (
        <div key={group.heading} className="space-y-2">
          <p className="text-xs font-semibold text-slate-brand px-1">{group.heading}</p>
          <ul className="bg-white rounded-2xl divide-y divide-[#E6E9E8] overflow-hidden">
            {group.items.map((item) => (
              <li key={`${item.kind}:${item.id}`}>
                <FeedLine item={item} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
