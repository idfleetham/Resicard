import { useRef } from "react";
import { MERCHANT_CATEGORIES, OFFER_TYPES } from "@shared/schema";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { OFFER_TYPE_LABELS, categoryLabel, needsIndicativeValue } from "@/components/resident/format";
import type { OfferFormHandle } from "./offer-form";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

interface Props {
  form: OfferFormHandle;
  imageFile: File | null;
  onImageChange: (file: File | null) => void;
  existingImageUrl: string | null;
}

export function OfferFormBasics({ form, imageFile, onImageChange, existingImageUrl }: Props) {
  const { toast } = useToast();
  const pdfInput = useRef<HTMLInputElement>(null);
  const type = form.watch("type") ?? "percentage_discount";
  const shortPromo = form.watch("shortPromo") ?? "";
  const tags = form.watch("tags") ?? [];
  const menuPdf = form.watch("menuPdf");

  const showPercent = type === "percentage_discount" || type === "off_peak";
  const showFixed = type === "fixed_price" || type === "set_menu" || type === "fixed_amount_discount";
  // Only some types need an indicative figure to estimate what residents save.
  const indicative = needsIndicativeValue(type);

  const onPdf = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) {
      toast({ title: "PDF too large", description: "Menus must be 5 MB or smaller.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => form.setValue("menuPdf", String(reader.result), { shouldDirty: true });
    reader.readAsDataURL(file);
  };

  return (
    <section className="space-y-4">
      <h3 className="font-display font-bold text-xl tracking-[-0.02em] text-sea">The offer</h3>

      <FormField control={form.control} name="title" render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs text-slate-brand">Title</FormLabel>
          <FormControl><Input placeholder="Lunch for locals" className="h-12 rounded-xl" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="shortPromo" render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs text-slate-brand">Short promo <span className="text-slate-brand font-normal">({shortPromo.length}/90)</span></FormLabel>
          <FormControl>
            <Input maxLength={90} placeholder="20% off food, Monday to Thursday" className="h-12 rounded-xl" {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-slate-brand">Type</FormLabel>
            <Select value={field.value ?? "percentage_discount"} onValueChange={field.onChange}>
              <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                {OFFER_TYPES.map((t) => <SelectItem key={t} value={t}>{OFFER_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-slate-brand">Category</FormLabel>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose" /></SelectTrigger></FormControl>
              <SelectContent>
                {MERCHANT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {showPercent && (
        <FormField control={form.control} name="percentOff" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-slate-brand">Percent off</FormLabel>
            <FormControl>
              <Input type="number" min={1} max={100} inputMode="numeric" className="h-12 rounded-xl max-w-[10rem]" {...field} value={String(field.value ?? "")} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      )}

      {showFixed && (
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="fixedPrice" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-brand">{type === "fixed_amount_discount" ? "Amount off (£)" : "Price (£)"}</FormLabel>
              <FormControl>
                <Input type="number" min={0} step="0.01" inputMode="decimal" className="h-12 rounded-xl" {...field} value={String(field.value ?? "")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          {type !== "fixed_amount_discount" && (
            <FormField control={form.control} name="originalValue" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-brand">Usual price (£)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" inputMode="decimal" className="h-12 rounded-xl" {...field} value={String(field.value ?? "")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}

      {indicative && (
        <FormField control={form.control} name={indicative} render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-slate-brand">
              {indicative === "typicalSpend" ? "Typical bill (£)" : "Usual price of the item (£)"}
            </FormLabel>
            <FormControl>
              <Input type="number" min={0} step="0.01" inputMode="decimal" className="h-12 rounded-xl max-w-[10rem]" {...field} value={String(field.value ?? "")} />
            </FormControl>
            <p className="text-xs text-slate-brand">
              {indicative === "typicalSpend"
                ? "Roughly what a resident spends when they use this offer. It is only used to estimate what residents have saved, and is never shown to them as a price."
                : "Roughly what the free or second item usually costs. It is only used to estimate what residents have saved, and is never shown to them as a price."}
              {" "}Leaving it blank simply means this offer never counts towards anyone's savings total.
            </p>
            <FormMessage />
          </FormItem>
        )} />
      )}

      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs text-slate-brand">Description</FormLabel>
          <FormControl>
            <Textarea rows={3} className="rounded-xl" placeholder="What the resident gets and anything staff need to know." {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormItem>
        <FormLabel className="text-xs text-slate-brand">Tags <span className="text-slate-brand font-normal">(comma separated)</span></FormLabel>
        <FormControl>
          <Input
            className="h-12 rounded-xl"
            placeholder="lunch, vegetarian, families"
            defaultValue={tags.join(", ")}
            onBlur={(e) =>
              form.setValue(
                "tags",
                e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                { shouldDirty: true },
              )
            }
          />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel className="text-xs text-slate-brand">Image</FormLabel>
        <FormControl>
          <Input
            type="file"
            accept="image/*"
            className="h-12 rounded-xl pt-3"
            onChange={(e) => onImageChange(e.target.files?.[0] ?? null)}
          />
        </FormControl>
        <p className="text-xs text-slate-brand">
          {imageFile ? `Selected: ${imageFile.name}` : existingImageUrl ? "An image is already attached; choose a file to replace it." : "Optional. Uploaded after the offer is saved."}
        </p>
      </FormItem>

      {type === "set_menu" && (
        <FormItem>
          <FormLabel className="text-xs text-slate-brand">Menu PDF <span className="text-slate-brand font-normal">(5 MB max)</span></FormLabel>
          <div className="flex items-center gap-3">
            <input ref={pdfInput} type="file" accept="application/pdf" className="hidden" onChange={(e) => onPdf(e.target.files?.[0] ?? null)} />
            <Button type="button" variant="outline" className="h-11 px-4 bg-white" onClick={() => pdfInput.current?.click()}>
              {menuPdf ? "Replace PDF" : "Choose PDF"}
            </Button>
            {menuPdf && (
              <Button type="button" variant="ghost" className="h-11 px-4 text-[#B5321A]" onClick={() => form.setValue("menuPdf", null, { shouldDirty: true })}>
                Remove
              </Button>
            )}
            <span className="text-sm text-slate-brand">{menuPdf ? "PDF attached" : "No PDF"}</span>
          </div>
        </FormItem>
      )}
    </section>
  );
}
