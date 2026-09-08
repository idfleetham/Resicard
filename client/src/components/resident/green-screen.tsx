import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { formatTime } from "@/components/resident/format";

/** Loyalty details as returned with a redemption or a reward claim. */
export interface GreenScreenLoyalty {
  points: number;
  tierName: string | null;
  tierDiscountPercent?: number | null;
  statusPoints?: number;
  tierWindowDays?: number;
  nextTier?: { name: string; thresholdPoints: number } | null;
}

export interface GreenScreenProps {
  kind: "redemption" | "reward";
  /** The big headline, one line per entry. */
  headlineLines: string[];
  /** The line under the headline: the offer title, or "Paid with N points" for a reward. */
  title: string;
  subtitle?: string | null;
  /** Hidden once the screen has expired. */
  terms?: string | null;
  merchant: { id: string; name: string; logoUrl: string | null };
  resident: { firstName: string | null; surname: string | null; profilePhoto: string | null };
  code: string;
  /** When the redemption or claim happened; the screen expires ten minutes later. */
  at: string | Date;
  loyalty: GreenScreenLoyalty | null;
  /** Optional line under the person card, e.g. "+12 points at The Criterion". */
  pointsLine?: string | null;
}

export const GREEN_SCREEN_EXPIRY_MS = 10 * 60 * 1000;
export const GREEN = "#1F8A5B";
const GREY = "#5C6F75";

/** Shown while a redemption or claim is loading. */
export function GreenScreenLoading() {
  return <div className="min-h-screen" style={{ backgroundColor: GREEN }} />;
}

function tierLine(loyalty: GreenScreenLoyalty): string {
  const parts = [`${loyalty.tierName} member`];
  if (loyalty.tierDiscountPercent) parts.push(`${loyalty.tierDiscountPercent}% tier discount applies`);
  return parts.join(" · ");
}

/**
 * The full-screen green confirmation the resident shows to staff, for an offer
 * redemption or a reward claim. Turns grey after ten minutes.
 */
export function GreenScreen(props: GreenScreenProps) {
  const { kind, headlineLines, title, subtitle, terms, merchant, resident, code, at, loyalty, pointsLine } = props;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const happenedAt = new Date(at);
  const expired = now.getTime() - happenedAt.getTime() > GREEN_SCREEN_EXPIRY_MS;
  const firstName = resident.firstName || "Resident";
  const isReward = kind === "reward";
  const pill = expired ? "Expired" : isReward ? "Reward claimed" : "Redeemed";
  const verb = isReward ? "claimed" : "redeemed";
  const headlineClass = isReward
    ? "font-display font-extrabold text-[48px] leading-[1.02] tracking-[-0.03em] break-words"
    : "font-display font-extrabold text-[96px] leading-[0.88] tracking-[-0.05em] break-words";

  return (
    <div
      className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{ backgroundColor: expired ? GREY : GREEN }}
    >
      <div className="absolute -right-[120px] -top-[120px] w-[360px] h-[360px] rounded-full bg-white/[0.08]" aria-hidden="true" />

      <div className="relative flex-1 flex flex-col max-w-md mx-auto w-full px-6 pt-7 pb-6">
        <div className="flex items-center justify-between">
          <Logo tone="white" size={22} />
          <div className="font-display font-bold text-2xl tabular-nums tracking-[0.02em]">{formatTime(now, true)}</div>
        </div>

        <div className="mt-11 flex flex-col gap-2.5">
          <div className="inline-flex items-center gap-2 self-start bg-white/[0.16] rounded-full px-3.5 py-2 text-[13px] font-bold tracking-[0.06em] uppercase">
            {!expired && <Check className="h-4 w-4" strokeWidth={3} />}
            {pill}
          </div>
          <h1 className="font-display font-bold text-[30px] leading-[1.05] tracking-[-0.02em]">{merchant.name}</h1>
        </div>

        <div className="mt-[30px] flex flex-col gap-1.5">
          <p className={headlineClass}>
            {headlineLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
          <p className="text-lg font-semibold mt-2.5">{title}</p>
          {subtitle && <p className="text-[13px] opacity-85">{subtitle}</p>}
          {terms && !expired && <p className="text-[13px] opacity-85 whitespace-pre-line">{terms}</p>}
        </div>

        <div className="mt-[30px] flex items-center gap-3.5 p-4 bg-white text-sea rounded-[18px]">
          <div className="h-[60px] w-[60px] flex-none rounded-full bg-sand overflow-hidden flex items-center justify-center">
            {resident.profilePhoto ? (
              <img src={resident.profilePhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-[#7A8A8F]" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <p className="font-display font-bold text-[22px] leading-none tracking-[-0.02em] truncate">{firstName}</p>
            <p className="text-[13px] font-semibold text-slate-brand">
              Verified resident · {verb} {formatTime(happenedAt)}
            </p>
          </div>
          <div className="flex-none text-right flex flex-col gap-0.5">
            <p className="text-[10px] tracking-[0.16em] uppercase font-bold text-slate-brand">Code</p>
            <p className="font-display font-extrabold text-[22px] leading-none tracking-[0.08em]">{code}</p>
          </div>
        </div>

        {loyalty?.tierName && (
          <div className="mt-3.5 text-sm opacity-95">
            <p className="font-semibold">{tierLine(loyalty)}</p>
          </div>
        )}

        {pointsLine && (
          <div className="mt-3.5 flex items-center justify-between text-sm font-semibold opacity-95">
            <span>{pointsLine}</span>
            {loyalty && !loyalty.tierName && <span>{loyalty.points} total</span>}
          </div>
        )}

        <div className="flex-1" />
        <Button asChild className="w-full h-[52px] text-base font-bold bg-white/[0.16] text-white hover:bg-white/[0.24] mt-8">
          <Link href="/resident">Done</Link>
        </Button>
      </div>
    </div>
  );
}

/** The foam "not found" fallback used by both green-screen pages. */
export function GreenScreenNotFound({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-foam text-sea flex flex-col items-center justify-center p-6 text-center gap-3">
      <Logo size={24} />
      <p className="font-display font-bold text-2xl tracking-[-0.02em] mt-4">{title}</p>
      <p className="text-sm text-slate-brand">{message}</p>
      <Button asChild className="h-12 mt-2">
        <Link href="/resident">Back to my card</Link>
      </Button>
    </div>
  );
}
