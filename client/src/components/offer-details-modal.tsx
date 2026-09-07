import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, MapPin, QrCode } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { PublicOffer } from "@/components/offer-card";
import { categoryLabel, offerConditions, offerHeadline, offerWhen } from "@/components/resident/format";

interface OfferDetailsModalProps {
  offer: PublicOffer | null;
  onClose: () => void;
}

export default function OfferDetailsModal({ offer, onClose }: OfferDetailsModalProps) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  if (!offer) return null;

  const when = offerWhen(offer);
  const conditions = offerConditions(offer);
  const image = offer.imageUrl || offer.merchant.logoUrl;
  const isResident = isAuthenticated && user?.role === "resident";

  return (
    <Dialog open={Boolean(offer)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {image && (
          <div className="aspect-[16/9] bg-slate-100">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5 space-y-4">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{offer.merchant.name}</span>
              <Badge variant="secondary">{categoryLabel(offer.category ?? offer.merchant.category)}</Badge>
            </div>
            <DialogTitle className="text-xl">{offer.title}</DialogTitle>
            <div className="text-2xl font-bold text-blue-700">{offerHeadline(offer)}</div>
            {offer.description && (
              <DialogDescription className="text-slate-700 text-base">{offer.description}</DialogDescription>
            )}
          </DialogHeader>

          {offer.merchant.address && <p className="text-sm text-slate-600">{offer.merchant.address}</p>}

          {when.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">When</p>
              <p className="text-sm text-slate-700">{when.join(" · ")}</p>
            </div>
          )}

          {(conditions.length > 0 || offer.terms) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Terms</p>
              {conditions.length > 0 && (
                <ul className="text-sm text-slate-700 list-disc pl-5 space-y-0.5">
                  {conditions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {offer.terms && <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{offer.terms}</p>}
            </div>
          )}

          {offer.hasMenuPdf && (
            <a
              href={`/api/offers/${offer.id}/menu-pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline"
            >
              <FileText className="h-4 w-4" />
              View the menu (PDF)
            </a>
          )}

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
            {isResident ? (
              <>
                <p className="text-sm text-slate-700 flex gap-2">
                  <QrCode className="h-5 w-5 shrink-0 text-slate-500" />
                  To redeem, scan the Resicard code at {offer.merchant.name} when you are there and choose this offer.
                </p>
                <Button className="w-full h-12 text-base" onClick={() => { onClose(); setLocation("/resident?tab=card&scan=1"); }}>
                  Scan a Resicard code
                </Button>
              </>
            ) : isAuthenticated ? (
              <p className="text-sm text-slate-700">Offers can be redeemed by residents with an active membership.</p>
            ) : (
              <>
                <p className="text-sm text-slate-700">
                  St Andrews residents redeem this by scanning the Resicard code at the outlet. Join to get started.
                </p>
                <Button className="w-full h-12 text-base" onClick={() => setLocation("/register")}>
                  Join Resicard
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setLocation("/login")}>
                  Already a member? Log in
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
