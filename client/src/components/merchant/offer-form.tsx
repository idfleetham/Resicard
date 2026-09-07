import { useEffect, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { insertOfferSchema, type InsertOffer, type Offer } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateOffer, useUpdateOffer, useUploadOfferImage } from "@/hooks/use-merchant-offers";
import { OfferFormBasics } from "./offer-form-basics";
import { OfferFormSchedule } from "./offer-form-schedule";
import { OfferFormLimits } from "./offer-form-limits";

export type OfferFormValues = z.input<typeof insertOfferSchema>;
export type OfferFormHandle = UseFormReturn<OfferFormValues, unknown, InsertOffer>;

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function toFormValues(offer?: Offer | null): OfferFormValues {
  return {
    title: offer?.title ?? "",
    shortPromo: offer?.shortPromo ?? "",
    description: offer?.description ?? "",
    type: offer?.type ?? "percentage_discount",
    percentOff: str(offer?.percentOff),
    fixedPrice: str(offer?.fixedPrice),
    originalValue: str(offer?.originalValue),
    category: offer?.category ?? "",
    tags: offer?.tags ?? [],
    daysOfWeek: offer?.daysOfWeek ?? [],
    timeSlots: offer?.timeSlots ?? {},
    validFrom: offer?.validFrom ?? "",
    validTo: offer?.validTo ?? "",
    blackoutDates: offer?.blackoutDates ?? [],
    maxPerDay: str(offer?.maxPerDay),
    maxPerWeek: str(offer?.maxPerWeek),
    maxLifetime: str(offer?.maxLifetime),
    globalUsageLimit: str(offer?.globalUsageLimit),
    minBasket: str(offer?.minBasket),
    maxDiscount: str(offer?.maxDiscount),
    eligibleTiers: offer?.eligibleTiers ?? [],
    stackable: offer?.stackable ?? false,
    newCustomerOnly: offer?.newCustomerOnly ?? false,
    dineInOnly: offer?.dineInOnly ?? false,
    excludesAlcohol: offer?.excludesAlcohol ?? false,
    terms: offer?.terms ?? "",
    menuPdf: offer?.menuPdf ?? null,
    active: offer?.active ?? true,
  };
}

/** Empty strings for optional text fields become nulls so the server clears them. */
function cleanForServer(values: InsertOffer): InsertOffer {
  const nullIfEmpty = (v: string | null | undefined) => (v && v.trim() !== "" ? v : null);
  const slots: Record<string, { start: string; end: string }[]> = {};
  for (const [day, list] of Object.entries(values.timeSlots ?? {})) {
    const kept = list.filter((s) => s.start && s.end);
    if (kept.length && (values.daysOfWeek ?? []).includes(day)) slots[day] = kept;
  }
  return {
    ...values,
    shortPromo: nullIfEmpty(values.shortPromo),
    description: nullIfEmpty(values.description),
    category: nullIfEmpty(values.category),
    terms: nullIfEmpty(values.terms),
    validFrom: nullIfEmpty(values.validFrom),
    validTo: nullIfEmpty(values.validTo),
    timeSlots: slots,
    menuPdf: values.type === "set_menu" ? values.menuPdf ?? null : null,
  };
}

interface OfferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer?: Offer | null;
  onSaved?: (offer: Offer) => void;
}

export default function OfferForm({ open, onOpenChange, offer, onSaved }: OfferFormProps) {
  const { toast } = useToast();
  const create = useCreateOffer();
  const update = useUpdateOffer();
  const uploadImage = useUploadOfferImage();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<OfferFormValues, unknown, InsertOffer>({
    resolver: zodResolver(insertOfferSchema),
    defaultValues: toFormValues(offer),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(offer));
      setImageFile(null);
    }
  }, [open, offer, form]);

  const saving = create.isPending || update.isPending || uploadImage.isPending;

  const onSubmit = async (values: InsertOffer) => {
    const data = cleanForServer(values);
    try {
      const saved = offer
        ? await update.mutateAsync({ id: offer.id, data })
        : await create.mutateAsync(data);
      if (imageFile) await uploadImage.mutateAsync({ id: saved.id, file: imageFile });
      toast({ title: offer ? "Offer updated" : "Offer created" });
      onSaved?.(saved);
      onOpenChange(false);
    } catch {
      // the mutation hooks already show a toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{offer ? "Edit offer" : "New offer"}</DialogTitle>
          <DialogDescription>
            Residents see the headline and short promo on their card; the rest applies when they redeem.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <OfferFormBasics
              form={form}
              imageFile={imageFile}
              onImageChange={setImageFile}
              existingImageUrl={offer?.imageUrl ?? null}
            />
            <OfferFormSchedule form={form} />
            <OfferFormLimits form={form} />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="h-11" disabled={saving}>
                {saving ? "Saving" : offer ? "Save changes" : "Create offer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
