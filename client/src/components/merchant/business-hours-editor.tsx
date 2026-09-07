import { Input } from "@/components/ui/input";
import { DAYS } from "./offer-form-schedule";

export type BusinessHours = Record<string, { open: string; close: string }>;

export function parseBusinessHours(raw: string | null | undefined): BusinessHours {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: BusinessHours = {};
    for (const [day, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        const v = value as { open?: unknown; close?: unknown };
        out[day] = { open: typeof v.open === "string" ? v.open : "", close: typeof v.close === "string" ? v.close : "" };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function serialiseBusinessHours(hours: BusinessHours): string {
  const out: BusinessHours = {};
  for (const [day, v] of Object.entries(hours)) {
    if (v.open || v.close) out[day] = v;
  }
  return JSON.stringify(out);
}

export function BusinessHoursEditor({ value, onChange }: { value: BusinessHours; onChange: (next: BusinessHours) => void }) {
  const set = (day: string, part: "open" | "close", text: string) =>
    onChange({ ...value, [day]: { ...(value[day] ?? { open: "", close: "" }), [part]: text } });

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Opening hours <span className="text-slate-400 font-normal">(leave blank if closed)</span></p>
      {DAYS.map((d) => (
        <div key={d.key} className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-2">
          <span className="text-sm text-slate-600">{d.label}</span>
          <Input type="time" className="h-11" value={value[d.key]?.open ?? ""} onChange={(e) => set(d.key, "open", e.target.value)} />
          <span className="text-sm text-slate-500">to</span>
          <Input type="time" className="h-11" value={value[d.key]?.close ?? ""} onChange={(e) => set(d.key, "close", e.target.value)} />
        </div>
      ))}
    </div>
  );
}
