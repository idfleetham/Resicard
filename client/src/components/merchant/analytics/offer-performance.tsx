import { Pill, SectionTitle } from "../portal-ui";
import { percent, type OfferPoint } from "./types";

/**
 * Offers ranked by redemptions. A bar list rather than a plotted chart: the titles
 * are long, the ranking is the point, and each row can carry its own number and
 * share without a legend or an axis.
 */
export default function OfferPerformance({ byOffer }: { byOffer: OfferPoint[] }) {
  const top = byOffer[0]?.redemptions ?? 0;

  return (
    <div className="bg-white rounded-2xl p-5">
      <SectionTitle>Offer performance</SectionTitle>
      <p className="text-xs text-slate-brand mt-1 mb-4">Which offers residents actually used, over the last 90 days.</p>

      {byOffer.length === 0 ? (
        <p className="text-sm text-slate-brand">No offers have been redeemed yet.</p>
      ) : (
        <ol className="space-y-3">
          {byOffer.map((offer) => (
            <li key={offer.offerId}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-bold text-sea truncate">
                  {offer.title}
                  <Pill tone="sand" className="ml-2 align-middle">{offer.headline}</Pill>
                </p>
                <p className="text-sm text-sea whitespace-nowrap">
                  <span className="font-bold">{offer.redemptions}</span>
                  <span className="text-slate-brand"> · {percent(offer.share)}</span>
                </p>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-foam overflow-hidden">
                <div
                  className="h-full rounded-full bg-sea"
                  style={{ width: `${top === 0 ? 0 : Math.max(2, (offer.redemptions / top) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
