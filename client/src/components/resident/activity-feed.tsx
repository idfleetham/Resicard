import { Link } from "wouter";
import { Ticket, Gift, Plus, Award } from "lucide-react";
import { formatTime } from "@/components/resident/format";

interface FeedMerchant {
  id: string;
  name: string;
  logoUrl: string | null;
}

/** One entry of GET /api/activity/mine. */
export type ActivityItem =
  | { kind: "redemption"; id: string; at: string; merchant: FeedMerchant; title: string; code: string; pointsAwarded: number }
  | { kind: "reward"; id: string; at: string; merchant: FeedMerchant; title: string; amount: number | null; claimId: string | null }
  | { kind: "points" | "tier"; id: string; at: string; merchant: FeedMerchant; title: string; amount: number | null };

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

/** A coloured disc that says what kind of thing happened before you read a word. */
function KindIcon({ kind }: { kind: ActivityItem["kind"] }) {
  const cls = "h-10 w-10 rounded-full flex items-center justify-center shrink-0";
  if (kind === "redemption") return <span className={`${cls} bg-sea text-foam`}><Ticket className="h-5 w-5" /></span>;
  if (kind === "reward") return <span className={`${cls} bg-buoy text-white`}><Gift className="h-5 w-5" /></span>;
  if (kind === "points") return <span className={`${cls} bg-redeemed text-white`}><Plus className="h-5 w-5" /></span>;
  return <span className={`${cls} bg-sand text-sea`}><Award className="h-5 w-5" /></span>;
}

function FeedLine({ item }: { item: ActivityItem }) {
  const amount = amountLabel(item);
  const body = (
    <>
      <KindIcon kind={item.kind} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold truncate leading-tight">{item.title}</span>
        <span className="block text-xs text-slate-brand truncate mt-0.5">
          {item.merchant.name} · {formatTime(item.at)}
        </span>
      </span>
      {item.kind === "redemption" ? (
        <span className="font-display font-extrabold text-sm tracking-[0.1em] shrink-0 bg-foam text-sea rounded-lg px-2.5 py-1.5">{item.code}</span>
      ) : amount ? (
        <span className={`text-sm font-bold tabular-nums shrink-0 ${amount.startsWith("+") ? "text-[#1F8A5B]" : "text-buoy"}`}>{amount}</span>
      ) : null}
    </>
  );
  const cls = "flex items-center gap-3 px-4 py-3";
  const href = item.kind === "redemption" ? `/redemptions/${item.id}` : item.kind === "reward" && item.claimId ? `/reward-claims/${item.claimId}` : null;
  if (href) {
    return (
      <Link href={href} className={`${cls} transition-colors hover:bg-[#FAFBFB] active:bg-foam`}>
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
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-sea px-1">{group.heading}</p>
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
