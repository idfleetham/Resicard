import type { Offer } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star } from "lucide-react";
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
      className="text-left w-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="relative aspect-[16/9] bg-slate-100">
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            {offer.merchant.name}
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge className="bg-white/90 text-slate-800 border-0 shadow-sm hover:bg-white">
            {categoryLabel(offer.category ?? offer.merchant.category)}
          </Badge>
          {offer.priority === "featured" && (
            <Badge className="bg-amber-400 text-amber-950 border-0 shadow-sm hover:bg-amber-400">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>
        <div className="absolute bottom-2 right-2 bg-blue-600 text-white font-bold text-lg px-3 py-1 rounded-lg shadow">
          {offerHeadline(offer)}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-1">
        <p className="text-sm font-medium text-slate-600 flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          {offer.merchant.name}
        </p>
        <h3 className="text-lg font-semibold text-slate-900 leading-snug">{offer.title}</h3>
        {offer.shortPromo && <p className="text-sm text-slate-600">{offer.shortPromo}</p>}
        {when.length > 0 && <p className="text-xs text-slate-500 mt-auto pt-2">{when.join(" · ")}</p>}
      </div>
    </button>
  );
}
