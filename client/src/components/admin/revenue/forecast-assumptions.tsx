import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { SectionTitle } from "@/components/merchant/portal-ui";
import type { ForecastAssumptions } from "./forecast";

interface Props {
  value: ForecastAssumptions;
  onChange: (next: ForecastAssumptions) => void;
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-sea">{label}</p>
        <p className="text-xs text-slate-brand">{hint}</p>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function toCount(raw: string): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Four forecast controls, kept in React state only. */
export default function ForecastAssumptionsCard({ value, onChange }: Props) {
  const set = (patch: Partial<ForecastAssumptions>) => onChange({ ...value, ...patch });

  return (
    <div className="bg-white rounded-2xl p-5">
      <div className="mb-4">
        <SectionTitle>Forecast assumptions</SectionTitle>
        <p className="text-xs text-slate-brand mt-1">Forecast only. Assumptions are not saved.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <Field label="Resident renewal rate" hint={`${value.residentRenewalRate}% renew`}>
          <Slider
            value={[value.residentRenewalRate]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => set({ residentRenewalRate: v })}
            aria-label="Resident renewal rate"
          />
        </Field>
        <Field label="Merchant monthly churn" hint={`${value.merchantMonthlyChurn}% a month`}>
          <Slider
            value={[value.merchantMonthlyChurn]}
            min={0}
            max={20}
            step={1}
            onValueChange={([v]) => set({ merchantMonthlyChurn: v })}
            aria-label="Merchant monthly churn"
          />
        </Field>
        <Field label="New residents per month" hint="Individual plan">
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="h-12 rounded-xl"
            value={value.newResidentsPerMonth}
            onChange={(e) => set({ newResidentsPerMonth: toCount(e.target.value) })}
            aria-label="New residents per month"
          />
        </Field>
        <Field label="New paying businesses per month" hint="Monthly fee">
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="h-12 rounded-xl"
            value={value.newMerchantsPerMonth}
            onChange={(e) => set({ newMerchantsPerMonth: toCount(e.target.value) })}
            aria-label="New paying businesses per month"
          />
        </Field>
      </div>
    </div>
  );
}
