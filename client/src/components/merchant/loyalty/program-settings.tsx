import { useEffect, useState } from "react";
import type { CardPattern, CardTheme, LoyaltyProgram, LoyaltyTier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLoyaltyMutation } from "./use-loyalty";
import CardDesign from "./card-design";
import { INPUT, SectionTitle } from "../portal-ui";

interface FormState {
  pointsPerCurrency: string;
  pointsPerRedemption: string;
  minBasketEarn: string;
  earnCooldownMinutes: string;
  dailyEarnCap: string;
  expiryDays: string;
  tierWindowDays: string;
  cardTheme: CardTheme;
  cardPattern: CardPattern;
  active: boolean;
}

function fromProgram(p: LoyaltyProgram | null | undefined): FormState {
  return {
    pointsPerCurrency: String(p?.pointsPerCurrency ?? 10),
    pointsPerRedemption: String(p?.pointsPerRedemption ?? 10),
    minBasketEarn: p?.minBasketEarn ? String(Number(p.minBasketEarn)) : "0",
    earnCooldownMinutes: String(p?.earnCooldownMinutes ?? 30),
    dailyEarnCap: String(p?.dailyEarnCap ?? 3),
    expiryDays: p?.expiryDays ? String(p.expiryDays) : "",
    tierWindowDays: String(p?.tierWindowDays ?? 365),
    cardTheme: p?.cardTheme ?? "sea",
    cardPattern: p?.cardPattern ?? "plain",
    active: p?.active ?? true,
  };
}

const NUMBERS: { key: keyof Omit<FormState, "active" | "cardTheme" | "cardPattern">; label: string; hint: string; step?: string }[] = [
  { key: "pointsPerCurrency", label: "Points per £1", hint: "When a bill total is entered" },
  { key: "pointsPerRedemption", label: "Points per scan", hint: "When no bill total is entered" },
  { key: "minBasketEarn", label: "Minimum spend to earn (£)", hint: "0 for none", step: "0.01" },
  { key: "earnCooldownMinutes", label: "Cooldown (minutes)", hint: "Between earns for one resident" },
  { key: "dailyEarnCap", label: "Daily earn cap", hint: "Earns per resident per day" },
  { key: "expiryDays", label: "Points expire after (days without a visit)", hint: "Blank for never. Minimum 90. Any visit resets the clock, so a regular never loses points" },
  { key: "tierWindowDays", label: "Tier status window (days)", hint: "Tier is based on points earned in this period. Default 365." },
];

/** The preview shows the top tier, because that is where the flat discount usually sits. */
function topTier(tiers: LoyaltyTier[]) {
  const sorted = [...tiers].sort((a, b) => (b.thresholdPoints ?? 0) - (a.thresholdPoints ?? 0));
  const t = sorted[0];
  return t ? { name: t.name, color: t.color, discountPercent: t.discountPercent } : null;
}

export default function ProgramSettings({
  program,
  tiers = [],
}: {
  program: LoyaltyProgram | null | undefined;
  tiers?: LoyaltyTier[];
}) {
  const [form, setForm] = useState<FormState>(() => fromProgram(program));
  useEffect(() => setForm(fromProgram(program)), [program]);

  const save = useLoyaltyMutation<FormState>(
    (f) => ({
      method: "PUT",
      url: "/api/loyalty/program",
      body: {
        pointsPerCurrency: Number(f.pointsPerCurrency),
        pointsPerRedemption: Number(f.pointsPerRedemption),
        minBasketEarn: Number(f.minBasketEarn || 0).toFixed(2),
        earnCooldownMinutes: Number(f.earnCooldownMinutes),
        dailyEarnCap: Number(f.dailyEarnCap),
        expiryDays: f.expiryDays ? Number(f.expiryDays) : null,
        tierWindowDays: Number(f.tierWindowDays) || 365,
        cardTheme: f.cardTheme,
        cardPattern: f.cardPattern,
        active: f.active,
      },
    }),
    { success: program ? "Programme saved" : "Programme created", error: "Could not save programme" },
  );

  return (
    <div className="bg-white rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionTitle>Programme settings</SectionTitle>
        <label className="flex items-center gap-2 text-sm font-bold text-sea">
          <span>{form.active ? "Running" : "Paused"}</span>
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        </label>
      </div>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NUMBERS.map((n) => (
            <div key={n.key} className="space-y-1">
              <Label htmlFor={`prog-${n.key}`} className="text-xs text-slate-brand">{n.label}</Label>
              <Input
                id={`prog-${n.key}`}
                type="number"
                min={0}
                step={n.step}
                inputMode={n.step ? "decimal" : "numeric"}
                className={INPUT}
                value={form[n.key]}
                onChange={(e) => setForm({ ...form, [n.key]: e.target.value })}
              />
              <p className="text-xs text-slate-brand">{n.hint}</p>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-[#E6E9E8] space-y-3">
          <SectionTitle>Card design</SectionTitle>
          <CardDesign
            theme={form.cardTheme}
            pattern={form.cardPattern}
            onChange={({ theme, pattern }) => setForm({ ...form, cardTheme: theme, cardPattern: pattern })}
            previewTier={topTier(tiers)}
          />
        </div>
        <Button type="submit" variant="buoy" className="h-12 px-8 w-full sm:w-auto" disabled={save.isPending}>
          {save.isPending ? "Saving" : program ? "Save" : "Create programme"}
        </Button>
      </form>
    </div>
  );
}
