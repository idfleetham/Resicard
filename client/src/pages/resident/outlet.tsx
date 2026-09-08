import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import type { Offer } from "@shared/schema";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/hooks/use-auth";
import OfferCard, { type PublicOffer } from "@/components/offer-card";
import OfferDetailsModal from "@/components/offer-details-modal";
import FavouriteButton from "@/components/resident/favourite-button";
import { OutletBadge } from "@/components/resident/points-list";
import { categoryLabel, offerHeadline, offerWhen } from "@/components/resident/format";
import type { Outlet } from "@/components/resident/outlets-tab";

type OutletOffer = Omit<Offer, "menuPdf"> & { hasMenuPdf: boolean };

/** Response of GET /api/outlets/:id. */
interface OutletDetails extends Omit<Outlet, "loyalty"> {
  offers: OutletOffer[];
  allOffers: OutletOffer[];
  loyalty: {
    points: number;
    statusPoints: number;
    tier: { name: string; color: string | null; discountPercent: number | null } | null;
    nextTier: { name: string; thresholdPoints: number } | null;
  } | null;
}

function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Offers on later in the week: title, headline and when they run, shown muted. */
function LaterOffer({ offer }: { offer: OutletOffer }) {
  const when = offerWhen(offer);
  return (
    <li className="bg-white rounded-2xl p-4 flex items-center gap-3 opacity-70">
      <span className="bg-foam text-slate-brand font-bold text-[13px] leading-none px-3 py-2 rounded-full shrink-0">
        {offerHeadline(offer)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sea truncate">{offer.title}</p>
        <p className="text-xs text-slate-brand truncate">{when.length ? when.join(" · ") : "Not on right now"}</p>
      </div>
    </li>
  );
}

function LoyaltyBlock({ outlet }: { outlet: OutletDetails }) {
  const loyalty = outlet.loyalty;
  if (!loyalty) return null;
  return (
    <div className="bg-sand rounded-2xl p-5 flex items-center gap-4">
      <div>
        <p className="font-display font-extrabold text-[32px] leading-none tracking-[-0.03em] text-sea tabular-nums">
          {loyalty.points}
        </p>
        <p className="text-xs text-sea mt-1">points here</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sea">{loyalty.tier?.name ?? "No tier yet"}</p>
        {loyalty.nextTier && (
          <p className="text-xs text-sea mt-0.5">
            {Math.max(0, loyalty.nextTier.thresholdPoints - loyalty.statusPoints)} points to {loyalty.nextTier.name}
          </p>
        )}
      </div>
      <Button asChild variant="outline" className="h-12 px-6 bg-white shrink-0">
        <Link href={`/loyalty/${outlet.id}`}>Show card</Link>
      </Button>
    </div>
  );
}

export default function OutletPage() {
  const { ready } = useRequireRole("resident");
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: outlet, isLoading, isError } = useQuery<OutletDetails>({
    queryKey: [`/api/outlets/${id}`],
    enabled: ready && Boolean(id),
  });
  const [selected, setSelected] = useState<PublicOffer | null>(null);

  const asPublic = (offer: OutletOffer): PublicOffer =>
    outlet
      ? {
          ...offer,
          merchant: {
            id: outlet.id,
            name: outlet.name,
            category: outlet.category,
            logoUrl: outlet.logoUrl,
            address: outlet.address,
          },
        }
      : (offer as unknown as PublicOffer);

  const liveIds = new Set((outlet?.offers ?? []).map((o) => o.id));
  const later = (outlet?.allOffers ?? []).filter((o) => !liveIds.has(o.id));

  return (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-6 sm:py-10 space-y-5">
        <Link href="/resident?tab=offers&view=outlets" className="inline-flex items-center gap-2 text-sm font-bold text-slate-brand">
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          Outlets
        </Link>

        {!ready || isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-40 bg-white rounded-2xl" />
            <div className="h-24 bg-white rounded-2xl" />
          </div>
        ) : isError || !outlet ? (
          <div className="bg-sand rounded-2xl p-8 text-center text-sea">We could not find that outlet.</div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-4">
                <OutletBadge name={outlet.name} logoUrl={outlet.logoUrl} size="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <h1 className="font-display font-extrabold text-[32px] leading-none tracking-[-0.03em] text-sea">
                    {outlet.name}
                  </h1>
                  <p className="text-xs text-slate-brand mt-2">{categoryLabel(outlet.category)}</p>
                  {outlet.address && (
                    <p className="text-sm text-slate-brand mt-1 flex flex-wrap items-center gap-2">
                      <MapPin className="h-5 w-5 shrink-0" strokeWidth={2} />
                      {outlet.address}
                      <a
                        href={mapsLink(outlet.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-sea underline underline-offset-4"
                      >
                        Directions
                      </a>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <FavouriteButton merchantId={outlet.id} isFavourite={outlet.isFavourite} variant="labelled" />
                {outlet.reservationUrl && (
                  <Button asChild variant="outline" className="h-12 px-6 bg-white">
                    <a href={outlet.reservationUrl} target="_blank" rel="noreferrer">Book a table</a>
                  </Button>
                )}
              </div>
            </div>

            <LoyaltyBlock outlet={outlet} />

            {outlet.allOffers.length === 0 ? (
              <div className="bg-sand rounded-2xl p-8 text-center text-sea">
                This outlet has not added any offers yet.
              </div>
            ) : (
              <>
                <section className="space-y-3">
                  <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">On now</h2>
                  {outlet.offers.length === 0 ? (
                    <p className="text-sm text-slate-brand">Nothing is on at this moment.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {outlet.offers.map((o) => (
                        <OfferCard key={o.id} offer={asPublic(o)} onOpen={setSelected} />
                      ))}
                    </div>
                  )}
                </section>

                {later.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Also on</h2>
                    <ul className="flex flex-col gap-3">
                      {later.map((o) => (
                        <LaterOffer key={o.id} offer={o} />
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </>
        )}

        <OfferDetailsModal offer={selected} onClose={() => setSelected(null)} />
      </main>
    </div>
  );
}
