import { useQuery } from "@tanstack/react-query";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { OfferFormHandle, OfferFormValues } from "./offer-form";
import { PROGRAM_KEY, type LoyaltyProgramData } from "./loyalty/types";

type NumberField = "maxPerDay" | "maxPerWeek" | "maxLifetime" | "globalUsageLimit" | "minBasket" | "maxDiscount";
type BoolField = "stackable" | "newCustomerOnly" | "dineInOnly" | "excludesAlcohol";

const NUMBER_FIELDS: { name: NumberField; label: string; step?: string }[] = [
  { name: "maxPerDay", label: "Per resident per day" },
  { name: "maxPerWeek", label: "Per resident per week" },
  { name: "maxLifetime", label: "Per resident ever" },
  { name: "globalUsageLimit", label: "Total redemptions" },
  { name: "minBasket", label: "Minimum spend (£)", step: "0.01" },
  { name: "maxDiscount", label: "Maximum discount (£)", step: "0.01" },
];

const BOOL_FIELDS: { name: BoolField; label: string }[] = [
  { name: "dineInOnly", label: "Dine in only" },
  { name: "excludesAlcohol", label: "Excludes alcohol" },
  { name: "newCustomerOnly", label: "New customers only" },
  { name: "stackable", label: "Can be combined with other offers" },
];

function NumberInput({ form, name, label, step }: { form: OfferFormHandle; name: NumberField; label: string; step?: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs text-slate-brand">{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              step={step}
              inputMode={step ? "decimal" : "numeric"}
              placeholder="No limit"
              className="h-12 rounded-xl"
              {...field}
              value={String((field.value as OfferFormValues[NumberField]) ?? "")}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function OfferFormLimits({ form }: { form: OfferFormHandle }) {
  const { data: loyalty } = useQuery<LoyaltyProgramData | null>({ queryKey: [...PROGRAM_KEY] });
  const tiers = loyalty?.tiers ?? [];
  const eligible = form.watch("eligibleTiers") ?? [];

  const toggleTier = (id: string) => {
    const next = eligible.includes(id) ? eligible.filter((t) => t !== id) : [...eligible, id];
    form.setValue("eligibleTiers", next, { shouldDirty: true });
  };

  return (
    <section className="space-y-4">
      <h3 className="font-display font-bold text-xl tracking-[-0.02em] text-sea">Limits and conditions</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {NUMBER_FIELDS.map((f) => (
          <NumberInput key={f.name} form={form} name={f.name} label={f.label} step={f.step} />
        ))}
      </div>

      {tiers.length > 0 && (
        <div>
          <p className="text-xs text-slate-brand mb-2">
            Loyalty tiers <span className="text-slate-brand font-normal">(none ticked means everyone)</span>
          </p>
          <div className="flex flex-wrap gap-3">
            {tiers.map((t) => (
              <label key={t.id} className="flex items-center gap-2 h-12 px-4 rounded-xl border border-[#E6E9E8] bg-white cursor-pointer text-sea">
                <Checkbox checked={eligible.includes(t.id)} onCheckedChange={() => toggleTier(t.id)} />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BOOL_FIELDS.map((f) => (
          <FormField
            key={f.name}
            control={form.control}
            name={f.name}
            render={({ field }) => (
              <FormItem>
                <label className="flex items-center gap-3 h-12 px-4 rounded-xl border border-[#E6E9E8] bg-white cursor-pointer text-sea">
                  <FormControl>
                    <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  </FormControl>
                  <span className="text-sm">{f.label}</span>
                </label>
              </FormItem>
            )}
          />
        ))}
      </div>

      <FormField
        control={form.control}
        name="terms"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-slate-brand">Terms</FormLabel>
            <FormControl>
              <Textarea rows={3} className="rounded-xl" placeholder="Not valid on bank holidays. One offer per table." {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
}
