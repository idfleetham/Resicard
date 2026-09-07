import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { useRequireRole } from "@/hooks/use-auth";
import { errorMessage, formatPounds, formatTime, offerHeadline } from "@/components/resident/format";
import type { OfferType } from "@shared/schema";

interface RedemptionDetails {
  redemption: { id: string; code: string; redeemedAt: string; pointsAwarded: number; basketAmount: number | null };
  offer: {
    id: string;
    title: string;
    type: OfferType | null;
    percentOff: number | null;
    fixedPrice: number | null;
    shortPromo: string | null;
    terms: string | null;
  };
  merchant: { id: string; name: string; logoUrl: string | null };
  resident: { firstName: string | null; surname: string | null; profilePhoto: string | null };
  loyalty: { points: number; tierName: string | null } | null;
}

const EXPIRY_MS = 10 * 60 * 1000;
const GREEN = "#1F8A5B";
const GREY = "#5C6F75";

/** Whole pounds without ".00" for the big headline. */
function bigPounds(value: number | string): string {
  return formatPounds(value).replace(/\.00$/, "");
}

/** The headline over one or two lines: ["20%", "off"], ["£15"], ["Free"]. */
function headlineLines(offer: RedemptionDetails["offer"]): string[] {
  switch (offer.type) {
    case "percentage_discount":
    case "off_peak":
      return offer.percentOff ? [`${offer.percentOff}%`, "off"] : ["Offer"];
    case "fixed_amount_discount":
      return offer.fixedPrice ? [bigPounds(offer.fixedPrice), "off"] : ["Money", "off"];
    case "fixed_price":
    case "set_menu":
      return offer.fixedPrice ? [bigPounds(offer.fixedPrice)] : ["Set", "price"];
    case "bogo":
      return ["2 for", "1"];
    case "free_item_with_purchase":
      return ["Free"];
    case "loyalty_reward":
      return ["Reward"];
    default: {
      const words = offerHeadline(offer).split(" ");
      return words.length > 1 ? [words[0], words.slice(1).join(" ")] : words;
    }
  }
}

export default function RedemptionSuccess() {
  const { id = "" } = useParams<{ id: string }>();
  const { ready } = useRequireRole("resident");
  const [now, setNow] = useState(() => new Date());

  const { data, isLoading, error } = useQuery<RedemptionDetails>({
    queryKey: [`/api/redemptions/${id}`],
    enabled: ready && id.length > 0,
  });

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!ready || isLoading) {
    return <div className="min-h-screen" style={{ backgroundColor: GREEN }} />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-foam text-sea flex flex-col items-center justify-center p-6 text-center gap-3">
        <Logo size={24} />
        <p className="font-display font-bold text-2xl tracking-[-0.02em] mt-4">Redemption not found</p>
        <p className="text-sm text-slate-brand">{error ? errorMessage(error) : ""}</p>
        <Button asChild className="h-12 mt-2">
          <Link href="/resident">Back to my card</Link>
        </Button>
      </div>
    );
  }

  const redeemedAt = new Date(data.redemption.redeemedAt);
  const expired = now.getTime() - redeemedAt.getTime() > EXPIRY_MS;
  const firstName = data.resident.firstName || "Resident";
  const lines = headlineLines(data.offer);

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
            {expired ? "Expired" : "Redeemed"}
          </div>
          <h1 className="font-display font-bold text-[30px] leading-[1.05] tracking-[-0.02em]">{data.merchant.name}</h1>
        </div>

        <div className="mt-[30px] flex flex-col gap-1.5">
          <p className="font-display font-extrabold text-[96px] leading-[0.88] tracking-[-0.05em] break-words">
            {lines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
          <p className="text-lg font-semibold mt-2.5">{data.offer.title}</p>
          {data.offer.shortPromo && <p className="text-[13px] opacity-85">{data.offer.shortPromo}</p>}
          {data.offer.terms && !expired && <p className="text-[13px] opacity-85 whitespace-pre-line">{data.offer.terms}</p>}
        </div>

        <div className="mt-[30px] flex items-center gap-3.5 p-4 bg-white text-sea rounded-[18px]">
          <div className="h-[60px] w-[60px] flex-none rounded-full bg-sand overflow-hidden flex items-center justify-center">
            {data.resident.profilePhoto ? (
              <img src={data.resident.profilePhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-[#7A8A8F]" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <p className="font-display font-bold text-[22px] leading-none tracking-[-0.02em] truncate">{firstName}</p>
            <p className="text-[13px] font-semibold text-slate-brand">Verified resident · redeemed {formatTime(redeemedAt)}</p>
          </div>
          <div className="flex-none text-right flex flex-col gap-0.5">
            <p className="text-[10px] tracking-[0.16em] uppercase font-bold text-slate-brand">Code</p>
            <p className="font-display font-extrabold text-[22px] leading-none tracking-[0.08em]">{data.redemption.code}</p>
          </div>
        </div>

        {data.redemption.pointsAwarded > 0 && (
          <div className="mt-3.5 flex items-center justify-between text-sm font-semibold opacity-95">
            <span>
              +{data.redemption.pointsAwarded} points at {data.merchant.name}
            </span>
            <span>{data.loyalty?.tierName ?? (data.loyalty ? `${data.loyalty.points} total` : "")}</span>
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
