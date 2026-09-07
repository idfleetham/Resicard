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
      <h3 className="font-semibold text-slate-900">When it applies</h3>

      <div>
        <p className="text-sm font-medium mb-2">Days <span className="text-slate-400 font-normal">(none selected means every day)</span></p>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d) => {
            const on = days.includes(d.key);
            return (
              <button
                key={d.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d.key)}
                className={`h-11 rounded-md text-sm font-medium border transition-colors ${
                  on ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
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
          <p className="text-sm font-medium">Times <span className="text-slate-400 font-normal">(leave blank for all day)</span></p>
          {DAYS.filter((d) => days.includes(d.key)).map((d) => (
            <div key={d.key} className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-2">
              <span className="text-sm text-slate-600">{d.label}</span>
              <Input type="time" className="h-11" value={slots[d.key]?.[0]?.start ?? ""} onChange={(e) => setSlot(d.key, "start", e.target.value)} />
              <span className="text-sm text-slate-500">to</span>
              <Input type="time" className="h-11" value={slots[d.key]?.[0]?.end ?? ""} onChange={(e) => setSlot(d.key, "end", e.target.value)} />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="validFrom" render={({ field }) => (
          <FormItem>
            <FormLabel>Valid from</FormLabel>
            <FormControl><Input type="date" className="h-11" {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="validTo" render={({ field }) => (
          <FormItem>
            <FormLabel>Valid to</FormLabel>
            <FormControl><Input type="date" className="h-11" {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Blackout dates</p>
          <Button type="button" variant="outline" size="sm" onClick={() => blackouts.append({ name: "", startDate: "", endDate: "" })}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {blackouts.fields.length === 0 && (
          <p className="text-sm text-slate-500">None. Add dates such as Christmas week or the Open when the offer should not apply.</p>
        )}
        {blackouts.fields.map((row, i) => (
          <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
            <FormField control={form.control} name={`blackoutDates.${i}.name`} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Name</FormLabel>
                <FormControl><Input className="h-11" placeholder="Christmas" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name={`blackoutDates.${i}.startDate`} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Start</FormLabel>
                <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name={`blackoutDates.${i}.endDate`} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">End</FormLabel>
                <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
              </FormItem>
            )} />
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-red-600" aria-label="Remove" onClick={() => blackouts.remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
