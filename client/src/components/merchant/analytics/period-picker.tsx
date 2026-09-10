import { useState } from "react";
import { DEFAULT_PERIOD, PERIOD_LABELS, isPeriodKey, type PeriodKey } from "@shared/periods";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { INPUT } from "../portal-ui";

/**
 * The observation period.
 *
 * Presets first, because a publican thinks in quarters and in "how was August",
 * not in rolling day counts — and a custom range for when they want the fortnight
 * around a specific event. Same treatment as the presets on the redemptions feed,
 * so the two screens do not each invent their own date control.
 */

export interface PeriodChoice {
  period: PeriodKey;
  from: string;
  to: string;
}

export const DEFAULT_CHOICE: PeriodChoice = { period: DEFAULT_PERIOD, from: "", to: "" };

const PRESETS: PeriodKey[] = ["quarter", "last-quarter", "month", "last-month", "30d", "90d", "year", "custom"];

/** Query string for GET /api/merchant/analytics. */
export function periodQuery(choice: PeriodChoice): string {
  const params = new URLSearchParams({ period: choice.period });
  if (choice.period === "custom") {
    if (choice.from) params.set("from", choice.from);
    if (choice.to) params.set("to", choice.to);
  }
  return params.toString();
}

export default function PeriodPicker({
  value,
  onChange,
  note,
}: {
  value: PeriodChoice;
  onChange: (next: PeriodChoice) => void;
  note: string;
}) {
  const [draft, setDraft] = useState({ from: value.from, to: value.to });

  return (
    <div className="bg-white rounded-2xl border border-hairline px-5 py-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((key) => {
          const active = value.period === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...value, period: key })}
              className={`h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap ${
                active ? "bg-sea text-foam" : "bg-foam text-sea hover:bg-[#E7EDEC]"
              }`}
            >
              {PERIOD_LABELS[key]}
            </button>
          );
        })}
      </div>

      {value.period === "custom" && (
        /* Stacked on a phone so the native calendar button has room to sit. */
        <div className="grid grid-cols-1 sm:flex gap-2 sm:items-end">
          <label className="text-xs text-slate-brand sm:w-44">
            From
            <Input
              type="date"
              className={`${INPUT} mt-1`}
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label className="text-xs text-slate-brand sm:w-44">
            To
            <Input
              type="date"
              className={`${INPUT} mt-1`}
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          <Button
            variant="buoy"
            className="h-12 px-6"
            disabled={!draft.from || !draft.to}
            onClick={() => onChange({ period: "custom", from: draft.from, to: draft.to })}
          >
            Apply
          </Button>
        </div>
      )}

      <p className="text-xs text-slate-brand">{note}</p>
    </div>
  );
}

export { isPeriodKey };
