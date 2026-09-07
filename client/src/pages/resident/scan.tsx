import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { LoyaltyBalance, LoyaltyProgram, LoyaltyTier } from "@shared/schema";
import { AlertCircle, ChevronRight, Crown, Star } from "lucide-react";
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

function fixLinkFor(reason: string): { href: string; label: string } | null {
  const r = reason.toLowerCase();
  if (r.includes("residency") || r.includes("verified")) return { href: "/resident", label: "Verify your address" };
  if (r.includes("membership")) return { href: "/resident", label: "Pay your membership" };
  return null;
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
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">{children}</main>
    </div>
  );

  if (!ready || scan.isLoading) {
    return shell(
      <div className="animate-pulse space-y-3">
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="h-20 bg-slate-200 rounded-xl" />
        <div className="h-20 bg-slate-200 rounded-xl" />
      </div>,
    );
  }

  if (scan.isError || !scan.data) {
    return shell(
      <>
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>That code did not work</AlertTitle>
          <AlertDescription>{scan.error ? errorMessage(scan.error) : "Unknown scan code."}</AlertDescription>
        </Alert>
        <Button asChild className="w-full h-12">
          <Link href="/resident">Back to my card</Link>
        </Button>
      </>,
    );
  }

  const { merchant, offers, unavailable = [], loyalty, canRedeem, reasons } = scan.data;

  return shell(
    <>
      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
        {merchant.logoUrl ? (
          <img src={merchant.logoUrl} alt="" className="h-14 w-14 rounded-lg object-cover border border-slate-200" />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-2xl font-bold">
            {merchant.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">You are at</p>
          <h1 className="text-xl font-bold text-slate-900 leading-tight truncate">{merchant.name}</h1>
          {merchant.address && <p className="text-sm text-slate-600 truncate">{merchant.address}</p>}
        </div>
      </div>

      {loyalty && (
        <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1 text-amber-900">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="text-xl font-bold">{loyalty.balance?.points ?? 0}</span>
            <span className="text-sm">points here</span>
          </div>
          {loyalty.tier && (
            <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-amber-900">
              <Crown className="h-4 w-4" />
              {loyalty.tier.name}
            </span>
          )}
        </div>
      )}

      {!canRedeem ? (
        <div className="space-y-3">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900">You cannot redeem here yet</AlertTitle>
            <AlertDescription className="text-amber-900">
              <ul className="list-disc pl-5 mt-1 space-y-1">
                {reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
          {reasons.map((r) => {
            const fix = fixLinkFor(r);
            return fix ? (
              <Button key={r} asChild className="w-full h-12 text-base">
                <Link href={fix.href}>{fix.label}</Link>
              </Button>
            ) : null;
          })}
          <Button asChild variant="ghost" className="w-full h-11">
            <Link href="/resident">Back to my card</Link>
          </Button>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-700">
          <p className="font-medium">No offers you can use right now at {merchant.name}.</p>
          {unavailable.length > 0 ? (
            <ul className="mt-3 text-sm text-slate-600 space-y-1 text-left">
              {unavailable.map((u) => (
                <li key={u.id}>
                  <span className="font-medium text-slate-800">{u.title}</span>: {u.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 mt-1">Some offers only run on certain days or times.</p>
          )}
          <Button asChild variant="outline" className="mt-4 h-11">
            <Link href="/resident?tab=offers">See all offers</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Choose an offer to redeem</p>
          {offers.map((offer) => {
            const when = offerWhen(offer);
            return (
              <button
                key={offer.id}
                type="button"
                onClick={() => setSelected(offer)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 active:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-blue-700">{offerHeadline(offer)}</p>
                  <p className="text-base font-semibold text-slate-900 leading-snug">{offer.title}</p>
                  {offer.shortPromo && <p className="text-sm text-slate-600">{offer.shortPromo}</p>}
                  {when.length > 0 && <p className="text-xs text-slate-500 mt-1">{when.join(" · ")}</p>}
                </div>
                <ChevronRight className="h-6 w-6 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
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
