import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/hooks/use-auth";
import { errorMessage, formatTime, offerHeadline, relativeTime } from "@/components/resident/format";
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
    return <div className="min-h-screen bg-slate-100" />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-lg font-semibold text-slate-900">Redemption not found</p>
        <p className="text-slate-600">{error ? errorMessage(error) : ""}</p>
        <Button asChild className="h-12">
          <Link href="/resident">Back to my card</Link>
        </Button>
      </div>
    );
  }

  const redeemedAt = new Date(data.redemption.redeemedAt);
  const expired = now.getTime() - redeemedAt.getTime() > EXPIRY_MS;
  const firstName = data.resident.firstName || "Resident";

  return (
    <div
      className={`min-h-screen flex flex-col text-white ${expired ? "bg-slate-600" : "bg-green-600"}`}
    >
      <div className="flex-1 flex flex-col items-center px-5 pt-8 pb-6 max-w-md mx-auto w-full text-center">
        {expired ? (
          <div className="rounded-full bg-black/25 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide">
            Expired view
          </div>
        ) : (
          <div className="flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="h-7 w-7" />
            Offer redeemed
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          {data.merchant.logoUrl && (
            <img src={data.merchant.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover bg-white" />
          )}
          <p className="text-xl font-semibold">{data.merchant.name}</p>
        </div>

        <p className="mt-6 text-2xl font-bold opacity-90">{offerHeadline(data.offer)}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold leading-tight">{data.offer.title}</h1>

        <div className="mt-8 flex items-center gap-4">
          <Avatar className="h-24 w-24 border-4 border-white/80 shadow-lg">
            <AvatarImage src={data.resident.profilePhoto ?? undefined} alt="" className="object-cover" />
            <AvatarFallback className="bg-white/20 text-white">
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-3xl font-bold leading-none">{firstName}</p>
            <p className="text-white/80 mt-1">St Andrews resident</p>
          </div>
        </div>

        <div className="mt-8 w-full rounded-2xl bg-white/15 py-5">
          <p className="text-sm uppercase tracking-wide text-white/80">Code</p>
          <p className="font-mono text-5xl sm:text-6xl font-bold tracking-[0.25em] pl-[0.25em]">{data.redemption.code}</p>
        </div>

        <div className="mt-6 w-full grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-black/15 py-3">
            <p className="text-xs uppercase tracking-wide text-white/80">Now</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{formatTime(now, true)}</p>
          </div>
          <div className="rounded-xl bg-black/15 py-3">
            <p className="text-xs uppercase tracking-wide text-white/80">Redeemed at</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{formatTime(redeemedAt)}</p>
            <p className="text-sm text-white/90">{relativeTime(redeemedAt, now)}</p>
          </div>
        </div>

        {data.redemption.pointsAwarded > 0 && (
          <p className="mt-5 text-lg">
            +{data.redemption.pointsAwarded} loyalty points
            {data.loyalty ? ` · ${data.loyalty.points} total${data.loyalty.tierName ? ` · ${data.loyalty.tierName}` : ""}` : ""}
          </p>
        )}

        {data.offer.terms && !expired && (
          <p className="mt-4 text-sm text-white/80 whitespace-pre-line">{data.offer.terms}</p>
        )}

        <div className="mt-auto pt-8 w-full">
          <Button asChild variant="secondary" className="w-full h-14 text-lg font-semibold">
            <Link href="/resident">Done</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
