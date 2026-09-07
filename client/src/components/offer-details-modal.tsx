import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
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
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] overflow-y-auto rounded-2xl border-0">
        <div className="relative aspect-[16/9] bg-sand">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display font-extrabold text-[64px] leading-none text-[#0F3B47]/70">
              {offer.merchant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute top-3 left-3 bg-buoy text-white font-bold text-[13px] leading-none px-3 py-2 rounded-full">
            {offerHeadline(offer)}
          </span>
        </div>
        <div className="p-5 space-y-4">
          <DialogHeader className="text-left space-y-1">
            <p className="text-xs font-semibold text-slate-brand">
              {offer.merchant.name}
              <span className="font-normal"> · {categoryLabel(offer.category ?? offer.merchant.category)}</span>
            </p>
            <DialogTitle className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">{offer.title}</DialogTitle>
            {offer.description && (
              <DialogDescription className="text-sea text-base leading-relaxed">{offer.description}</DialogDescription>
            )}
          </DialogHeader>

          {offer.merchant.address && <p className="text-sm text-slate-brand">{offer.merchant.address}</p>}

          {when.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-brand mb-1">When</p>
              <p className="text-sm text-sea">{when.join(" · ")}</p>
            </div>
          )}

          {(conditions.length > 0 || offer.terms) && (
            <div>
              <p className="text-xs font-semibold text-slate-brand mb-1">Terms</p>
              {conditions.length > 0 && (
                <ul className="text-sm text-sea list-disc pl-5 space-y-0.5">
                  {conditions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {offer.terms && <p className="text-sm text-sea mt-1 whitespace-pre-line">{offer.terms}</p>}
            </div>
          )}

          {offer.hasMenuPdf && (
            <a
              href={`/api/offers/${offer.id}/menu-pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-sea underline underline-offset-[3px]"
            >
              <FileText className="h-5 w-5" />
              View the menu (PDF)
            </a>
          )}

          <div className="rounded-2xl bg-sand p-5 space-y-3">
            {isResident ? (
              <>
                <p className="text-sm text-sea">
                  To redeem, scan the Resicard code at {offer.merchant.name} when you are there and choose this offer.
                </p>
                <Button variant="buoy" className="w-full h-12 text-base" onClick={() => { onClose(); setLocation("/resident?tab=card&scan=1"); }}>
                  Scan a Resicard code
                </Button>
              </>
            ) : isAuthenticated ? (
              <p className="text-sm text-sea">Offers can be redeemed by residents with an active membership.</p>
            ) : (
              <>
                <p className="text-sm text-sea">
                  St Andrews residents redeem this by scanning the Resicard code at the outlet. Join to get started.
                </p>
                <Button variant="buoy" className="w-full h-12 text-base" onClick={() => setLocation("/register")}>
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
