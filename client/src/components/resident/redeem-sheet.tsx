import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Offer } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, offerConditions, offerHeadline } from "@/components/resident/format";

export type ScanOffer = Omit<Offer, "menuPdf"> & { hasMenuPdf: boolean };

interface RedeemSheetProps {
  scanCode: string;
  offer: ScanOffer | null;
  hasLoyalty: boolean;
  onClose: () => void;
}

interface RedeemResponse {
  redemption: { id: string };
}

export default function RedeemSheet({ scanCode, offer, hasLoyalty, onClose }: RedeemSheetProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [basket, setBasket] = useState("");

  const redeem = useMutation({
    mutationFn: async () => {
      if (!offer) throw new Error("No offer selected");
      const amount = basket.trim() === "" ? null : Number(basket);
      if (amount !== null && (Number.isNaN(amount) || amount < 0)) throw new Error("Enter the bill total as a number, e.g. 24.50");
      const res = await apiRequest("POST", "/api/redemptions", { scanCode, offerId: offer.id, basketAmount: amount });
      return (await res.json()) as RedeemResponse;
    },
    onSuccess: (data) => {
      setLocation(`/redemptions/${data.redemption.id}`);
    },
    onError: (err) => toast({ title: "Could not redeem", description: errorMessage(err), variant: "destructive" }),
  });

  const conditions = offer ? offerConditions(offer) : [];

  return (
    <Dialog open={Boolean(offer)} onOpenChange={(open) => !open && !redeem.isPending && onClose()}>
      <DialogContent className="max-w-md p-5 rounded-2xl border-0 text-sea">
        {offer && (
          <>
            <DialogHeader className="text-left space-y-1">
              <p className="font-display font-extrabold text-[42px] leading-none tracking-[-0.03em]">{offerHeadline(offer)}</p>
              <DialogTitle className="font-display font-bold text-xl tracking-[-0.02em]">{offer.title}</DialogTitle>
              {offer.shortPromo && <DialogDescription className="text-base text-slate-brand">{offer.shortPromo}</DialogDescription>}
            </DialogHeader>

            {(conditions.length > 0 || offer.terms) && (
              <div className="text-sm space-y-1">
                {conditions.length > 0 && (
                  <ul className="list-disc pl-5">
                    {conditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
                {offer.terms && <p className="whitespace-pre-line">{offer.terms}</p>}
              </div>
            )}

            {hasLoyalty && (
              <div>
                <label htmlFor="basket" className="text-sm font-semibold">
                  Bill total (optional, for loyalty points)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-brand">£</span>
                  <Input
                    id="basket"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={basket}
                    onChange={(e) => setBasket(e.target.value)}
                    className="h-12 pl-8 text-base rounded-xl"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-slate-brand">
              Only redeem when you are ready to pay. Staff will see the confirmation screen.
            </p>

            <Button variant="buoy" className="w-full h-14 text-base" disabled={redeem.isPending} onClick={() => redeem.mutate()}>
              {redeem.isPending ? "Redeeming" : "Redeem now"}
            </Button>
            <Button variant="ghost" className="w-full h-11" disabled={redeem.isPending} onClick={onClose}>
              Back
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
