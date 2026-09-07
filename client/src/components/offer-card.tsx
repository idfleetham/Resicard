import type { Offer } from "@shared/schema";
import { categoryLabel, offerHeadline, offerWhen } from "@/components/resident/format";

/** Shape returned by GET /api/offers (menuPdf removed, hasMenuPdf added, merchant attached). */
export type PublicOffer = Omit<Offer, "menuPdf"> & {
  hasMenuPdf: boolean;
  merchant: {
    id: string;
    name: string;
    category: string | null;
    logoUrl: string | null;
    address: string | null;
  };
};

interface OfferCardProps {
  offer: PublicOffer;
  onOpen: (offer: PublicOffer) => void;
}

export default function OfferCard({ offer, onOpen }: OfferCardProps) {
  const image = offer.imageUrl || offer.merchant.logoUrl;
  const when = offerWhen(offer);

  return (
    <button
      type="button"
      onClick={() => onOpen(offer)}
      className="text-left w-full bg-white rounded-2xl overflow-hidden flex flex-col transition-colors hover:bg-[#FAFBFB] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-foam"
    >
      <div className="relative aspect-[16/9] bg-sand">
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display font-extrabold text-[56px] leading-none text-[#0F3B47]/70 tracking-[-0.03em]">
            {offer.merchant.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="bg-buoy text-white font-bold text-[13px] leading-none px-3 py-2 rounded-full">
            {offerHeadline(offer)}
          </span>
          {offer.priority === "featured" && (
            <span className="bg-white/90 text-sea font-semibold text-[11px] leading-none px-2.5 py-2 rounded-full">
              Featured
            </span>
          )}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-1">
        <p className="text-xs font-semibold text-slate-brand">
          {offer.merchant.name}
          <span className="font-normal"> · {categoryLabel(offer.category ?? offer.merchant.category)}</span>
        </p>
        <h3 className="font-display font-bold text-lg leading-snug tracking-[-0.02em] text-sea">{offer.title}</h3>
        {offer.shortPromo && <p className="text-sm text-slate-brand">{offer.shortPromo}</p>}
        {when.length > 0 && <p className="text-xs text-slate-brand mt-auto pt-2">{when.join(" · ")}</p>}
      </div>
    </button>
  );
}
