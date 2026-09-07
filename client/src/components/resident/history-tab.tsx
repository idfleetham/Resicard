import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CustomerLoyaltyCard, type LoyaltyMembership } from "@/components/loyalty/customer-loyalty-card";
import { formatDate, formatTime } from "@/components/resident/format";

interface RedemptionRow {
  id: string;
  code: string;
  redeemedAt: string;
  basketAmount: number | null;
  pointsAwarded: number | null;
  offerId: string;
  offerTitle: string;
  merchantId: string;
  merchantName: string;
  merchantLogoUrl: string | null;
}

function EmptyNote({ children }: { children: string }) {
  return <div className="bg-sand rounded-2xl p-5 text-sm text-sea">{children}</div>;
}

export default function HistoryTab() {
  const redemptions = useQuery<RedemptionRow[]>({ queryKey: ["/api/redemptions/mine"] });
  const loyalty = useQuery<LoyaltyMembership[]>({ queryKey: ["/api/loyalty/mine"] });

  return (
    <div className="space-y-8 text-sea">
      <section className="space-y-3">
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Loyalty points</h2>
        {loyalty.isLoading ? (
          <div className="bg-white rounded-2xl p-5 animate-pulse h-28" />
        ) : !loyalty.data || loyalty.data.length === 0 ? (
          <EmptyNote>
            No points yet. Outlets with a loyalty programme award points automatically when you redeem an offer.
          </EmptyNote>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {loyalty.data.map((m) => (
              <CustomerLoyaltyCard key={m.merchant.id} membership={m} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Redemptions</h2>
        {redemptions.isLoading ? (
          <div className="bg-white rounded-2xl p-5 animate-pulse h-28" />
        ) : !redemptions.data || redemptions.data.length === 0 ? (
          <EmptyNote>Nothing redeemed yet. Scan the Resicard code at an outlet to use your first offer.</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-3">
            {redemptions.data.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/redemptions/${r.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl p-4 transition-colors hover:bg-[#FAFBFB] active:bg-foam"
                >
                  {r.merchantLogoUrl ? (
                    <img src={r.merchantLogoUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-sand text-sea flex items-center justify-center font-display font-extrabold text-lg">
                      {r.merchantName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{r.offerTitle}</p>
                    <p className="text-sm text-slate-brand truncate">{r.merchantName}</p>
                    <p className="text-xs text-slate-brand">
                      {formatDate(r.redeemedAt)} {formatTime(r.redeemedAt)}
                      {r.pointsAwarded ? ` · +${r.pointsAwarded} points` : ""}
                    </p>
                  </div>
                  <span className="font-display font-extrabold text-sm tracking-[0.08em]">{r.code}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
