import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { LoyaltyBalance, LoyaltyProgram, LoyaltyTier } from "@shared/schema";
import { AlertCircle, ChevronRight } from "lucide-react";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRequireRole } from "@/hooks/use-auth";
import RedeemSheet, { type ScanOffer } from "@/components/resident/redeem-sheet";
import { errorMessage, offerHeadline, offerWhen } from "@/components/resident/format";

interface ScanResponse {
  merchant: { id: string; name: string; category: string | null; logoUrl: string | null; address: string | null };
  offers: ScanOffer[];
  unavailable: { id: string; title: string; reason: string }[];
  loyalty: { program: LoyaltyProgram; balance: LoyaltyBalance | null; tier: LoyaltyTier | null } | null;
  canRedeem: boolean;
  reasons: string[];
}

const PREMIUM_REASON = "premium membership";

function fixLinkFor(reason: string): { href: string; label: string } | null {
  const r = reason.toLowerCase();
  if (r.includes("residency") || r.includes("verified")) return { href: "/resident", label: "Verify your address" };
  if (r.includes("membership")) return { href: "/resident?tab=resicard", label: "Go Premium" };
  return null;
}

/** True when the only thing stopping a redemption is that the resident is on Free. */
function premiumOnly(canRedeem: boolean, reasons: string[]): boolean {
  return !canRedeem && reasons.length > 0 && reasons.every((r) => r.toLowerCase().includes(PREMIUM_REASON));
}

function OfferList({ offers, disabled, onSelect }: { offers: ScanOffer[]; disabled: boolean; onSelect: (offer: ScanOffer) => void }) {
  return (
    <div className={`flex flex-col gap-3 ${disabled ? "opacity-50" : ""}`} aria-disabled={disabled}>
      <p className="text-xs font-semibold text-slate-brand mt-2">{disabled ? "Offers at this outlet" : "Choose an offer to redeem"}</p>
      {offers.map((offer) => {
        const when = offerWhen(offer);
        return (
          <button
            key={offer.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(offer)}
            className="w-full text-left bg-white rounded-2xl p-5 min-h-[104px] flex items-center gap-4 transition-colors hover:bg-[#FAFBFB] active:bg-foam focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-foam disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <p className="font-display font-extrabold text-[28px] leading-[0.95] tracking-[-0.03em] w-[104px] flex-none">
              {offerHeadline(offer)}
            </p>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-snug">{offer.title}</p>
              {offer.shortPromo && <p className="text-sm text-slate-brand">{offer.shortPromo}</p>}
              {when.length > 0 && <p className="text-xs text-slate-brand mt-1">{when.join(" · ")}</p>}
            </div>
            <ChevronRight className="h-6 w-6 text-slate-brand shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

export default function ScanPage() {
  const { scanCode = "" } = useParams<{ scanCode: string }>();
  const { ready } = useRequireRole("resident");
  const [selected, setSelected] = useState<ScanOffer | null>(null);

  const scan = useQuery<ScanResponse>({
    queryKey: [`/api/scan/${encodeURIComponent(scanCode)}`],
    enabled: ready && scanCode.length > 0,
    staleTime: 0,
  });

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <main className="max-w-lg mx-auto px-5 py-6 flex flex-col gap-3">{children}</main>
    </div>
  );

  if (!ready || scan.isLoading) {
    return shell(
      <div className="animate-pulse flex flex-col gap-3">
        <div className="h-20 bg-white rounded-2xl" />
        <div className="h-14 bg-sand rounded-2xl" />
        <div className="h-24 bg-white rounded-2xl" />
        <div className="h-24 bg-white rounded-2xl" />
      </div>,
    );
  }

  if (scan.isError || !scan.data) {
    return shell(
      <>
        <Alert variant="destructive" className="rounded-2xl bg-white">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-bold">That code did not work</AlertTitle>
          <AlertDescription>{scan.error ? errorMessage(scan.error) : "Unknown scan code."}</AlertDescription>
        </Alert>
        <Button asChild className="w-full h-12 text-base">
          <Link href="/resident">Back to my card</Link>
        </Button>
      </>,
    );
  }

  const { merchant, offers, unavailable = [], loyalty, canRedeem, reasons } = scan.data;
  const needsPremium = premiumOnly(canRedeem, reasons);

  return shell(
    <>
      <div className="flex items-center gap-4 bg-white rounded-2xl p-5">
        {merchant.logoUrl ? (
          <img src={merchant.logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover flex-none" />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-sand text-sea flex items-center justify-center font-display font-extrabold text-2xl flex-none">
            {merchant.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-brand">You are at</p>
          <h1 className="font-display font-bold text-2xl leading-tight tracking-[-0.02em] truncate">{merchant.name}</h1>
          {merchant.address && <p className="text-sm text-slate-brand truncate">{merchant.address}</p>}
        </div>
      </div>

      {loyalty && (
        <div className="flex items-baseline gap-2 bg-sand rounded-2xl px-5 py-3">
          <span className="font-display font-extrabold text-2xl leading-none tabular-nums">{loyalty.balance?.points ?? 0}</span>
          <span className="text-sm">points here</span>
          {loyalty.tier && <span className="ml-auto text-sm font-bold">{loyalty.tier.name}</span>}
        </div>
      )}

      {needsPremium ? (
        <div className="flex flex-col gap-3">
          <div className="bg-sand rounded-2xl p-5 flex flex-col gap-3">
            <div>
              <p className="font-display font-bold text-xl tracking-[-0.02em]">Go Premium to redeem offers</p>
              {loyalty && <p className="text-sm text-slate-brand mt-1">Points and tier benefits work on Free.</p>}
            </div>
            <Button asChild variant="buoy" className="w-full h-12 text-base">
              <Link href="/resident?tab=resicard">Go Premium</Link>
            </Button>
          </div>
          {offers.length > 0 && <OfferList offers={offers} disabled onSelect={() => undefined} />}
          <Button asChild variant="ghost" className="w-full h-11">
            <Link href="/resident">Back to my card</Link>
          </Button>
        </div>
      ) : !canRedeem ? (
        <div className="flex flex-col gap-3">
          <div className="bg-sand rounded-2xl p-5">
            <p className="font-display font-bold text-xl tracking-[-0.02em]">You cannot redeem here yet</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          {reasons.map((r, i) => {
            const fix = fixLinkFor(r);
            return fix ? (
              <Button key={r} asChild variant={i === 0 ? "buoy" : "default"} className="w-full h-12 text-base">
                <Link href={fix.href}>{fix.label}</Link>
              </Button>
            ) : null;
          })}
          <Button asChild variant="ghost" className="w-full h-11">
            <Link href="/resident">Back to my card</Link>
          </Button>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-sand rounded-2xl p-6 text-center">
          <p className="font-bold">No offers you can use right now at {merchant.name}.</p>
          {unavailable.length > 0 ? (
            <ul className="mt-3 text-sm text-slate-brand space-y-1 text-left">
              {unavailable.map((u) => (
                <li key={u.id}>
                  <span className="font-semibold text-sea">{u.title}</span>: {u.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-brand mt-1">Some offers only run on certain days or times.</p>
          )}
          <Button asChild variant="outline" className="mt-4 h-11 bg-transparent border-[#0F3B47]/30">
            <Link href="/resident?tab=offers">See all offers</Link>
          </Button>
        </div>
      ) : (
        <OfferList offers={offers} disabled={false} onSelect={setSelected} />
      )}

      <RedeemSheet
        scanCode={scanCode}
        offer={selected}
        hasLoyalty={Boolean(loyalty)}
        onClose={() => setSelected(null)}
      />
    </>,
  );
}
