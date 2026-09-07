import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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

export default function HistoryTab() {
  const redemptions = useQuery<RedemptionRow[]>({ queryKey: ["/api/redemptions/mine"] });
  const loyalty = useQuery<LoyaltyMembership[]>({ queryKey: ["/api/loyalty/mine"] });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Loyalty points</h2>
        {loyalty.isLoading ? (
          <Card>
            <CardContent className="p-5 animate-pulse h-28" />
          </Card>
        ) : !loyalty.data || loyalty.data.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-slate-600">
              No points yet. Outlets with a loyalty programme award points automatically when you redeem an offer.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loyalty.data.map((m) => (
              <CustomerLoyaltyCard key={m.merchant.id} membership={m} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Redemptions</h2>
        {redemptions.isLoading ? (
          <Card>
            <CardContent className="p-5 animate-pulse h-28" />
          </Card>
        ) : !redemptions.data || redemptions.data.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-slate-600">
              Nothing redeemed yet. Scan the Resicard code at an outlet to use your first offer.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-slate-200">
              {redemptions.data.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/redemptions/${r.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 active:bg-slate-100"
                  >
                    {r.merchantLogoUrl ? (
                      <img src={r.merchantLogoUrl} alt="" className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                        {r.merchantName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{r.offerTitle}</p>
                      <p className="text-sm text-slate-600 truncate">{r.merchantName}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(r.redeemedAt)} {formatTime(r.redeemedAt)}
                        {r.pointsAwarded ? ` · +${r.pointsAwarded} points` : ""}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-700 tracking-wider">{r.code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
