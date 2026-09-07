import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { OfferFormHandle } from "./offer-form";

export const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export function OfferFormSchedule({ form }: { form: OfferFormHandle }) {
  const days = form.watch("daysOfWeek") ?? [];
  const slots = form.watch("timeSlots") ?? {};
  const blackouts = useFieldArray({ control: form.control, name: "blackoutDates" });

  const toggleDay = (day: string) => {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    form.setValue("daysOfWeek", DAYS.map((d) => d.key).filter((k) => next.includes(k)), { shouldDirty: true });
  };

  const setSlot = (day: string, part: "start" | "end", value: string) => {
    const current = slots[day]?.[0] ?? { start: "", end: "" };
    form.setValue("timeSlots", { ...slots, [day]: [{ ...current, [part]: value }] }, { shouldDirty: true });
  };

  return (
    <section className="space-y-4">
      <h3 className="font-display font-bold text-xl tracking-[-0.02em] text-sea">When it applies</h3>

      <div>
        <p className="text-xs text-slate-brand mb-2">Days <span className="text-slate-brand font-normal">(none selected means every day)</span></p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => {
            const on = days.includes(d.key);
            return (
              <button
                key={d.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d.key)}
                className={`h-11 rounded-full text-sm font-bold transition-colors ${
                  on ? "bg-sea text-foam" : "bg-white border border-[#E6E9E8] text-sea hover:bg-foam"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {days.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-brand">Times <span className="text-slate-brand font-normal">(leave blank for all day)</span></p>
          {DAYS.filter((d) => days.includes(d.key)).map((d) => (
            <div key={d.key} className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-2">
              <span className="text-sm text-sea">{d.label}</span>
              <Input type="time" className="h-12 rounded-xl" value={slots[d.key]?.[0]?.start ?? ""} onChange={(e) => setSlot(d.key, "start", e.target.value)} />
              <span className="text-sm text-slate-brand">to</span>
              <Input type="time" className="h-12 rounded-xl" value={slots[d.key]?.[0]?.end ?? ""} onChange={(e) => setSlot(d.key, "end", e.target.value)} />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="validFrom" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-slate-brand">Valid from</FormLabel>
            <FormControl><Input type="date" className="h-12 rounded-xl" {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="validTo" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-slate-brand">Valid to</FormLabel>
            <FormControl><Input type="date" className="h-12 rounded-xl" {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-brand">Blackout dates</p>
          <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => blackouts.append({ name: "", startDate: "", endDate: "" })}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {blackouts.fields.length === 0 && (
          <p className="text-sm text-slate-brand">None. Add dates such as Christmas week or the Open when the offer should not apply.</p>
        )}
        {blackouts.fields.map((row, i) => (
          <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
            <FormField control={form.control} name={`blackoutDates.${i}.name`} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-brand">Name</FormLabel>
                <FormControl><Input className="h-12 rounded-xl" placeholder="Christmas" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name={`blackoutDates.${i}.startDate`} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-brand">Start</FormLabel>
                <FormControl><Input type="date" className="h-12 rounded-xl" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name={`blackoutDates.${i}.endDate`} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-brand">End</FormLabel>
                <FormControl><Input type="date" className="h-12 rounded-xl" {...field} /></FormControl>
              </FormItem>
            )} />
            <Button type="button" variant="ghost" size="icon" className="h-12 w-12 text-slate-brand hover:text-[#B5321A]" aria-label="Remove" onClick={() => blackouts.remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
