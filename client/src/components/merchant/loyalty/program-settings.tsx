import { useEffect, useState } from "react";
import type { LoyaltyProgram } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLoyaltyMutation } from "./use-loyalty";

interface FormState {
  model: "points" | "stamps";
  pointsPerCurrency: string;
  pointsPerRedemption: string;
  minBasketEarn: string;
  earnCooldownMinutes: string;
  dailyEarnCap: string;
  expiryDays: string;
  active: boolean;
}

function fromProgram(p: LoyaltyProgram | null | undefined): FormState {
  return {
    model: p?.model ?? "points",
    pointsPerCurrency: String(p?.pointsPerCurrency ?? 10),
    pointsPerRedemption: String(p?.pointsPerRedemption ?? 10),
    minBasketEarn: p?.minBasketEarn ? String(Number(p.minBasketEarn)) : "0",
    earnCooldownMinutes: String(p?.earnCooldownMinutes ?? 30),
    dailyEarnCap: String(p?.dailyEarnCap ?? 3),
    expiryDays: p?.expiryDays ? String(p.expiryDays) : "",
    active: p?.active ?? true,
  };
}

const NUMBERS: { key: keyof Omit<FormState, "model" | "active">; label: string; hint: string; step?: string }[] = [
  { key: "pointsPerCurrency", label: "Points per £1", hint: "When a bill total is entered" },
  { key: "pointsPerRedemption", label: "Points per scan", hint: "When no bill total is entered" },
  { key: "minBasketEarn", label: "Minimum spend to earn (£)", hint: "0 for none", step: "0.01" },
  { key: "earnCooldownMinutes", label: "Cooldown (minutes)", hint: "Between earns for one resident" },
  { key: "dailyEarnCap", label: "Daily earn cap", hint: "Earns per resident per day" },
  { key: "expiryDays", label: "Points expire after (days)", hint: "Blank for never" },
];

export default function ProgramSettings({ program }: { program: LoyaltyProgram | null | undefined }) {
  const [form, setForm] = useState<FormState>(() => fromProgram(program));
  useEffect(() => setForm(fromProgram(program)), [program]);

  const save = useLoyaltyMutation<FormState>(
    (f) => ({
      method: "PUT",
      url: "/api/loyalty/program",
      body: {
        model: f.model,
        pointsPerCurrency: Number(f.pointsPerCurrency),
        pointsPerRedemption: Number(f.pointsPerRedemption),
        minBasketEarn: Number(f.minBasketEarn || 0).toFixed(2),
        earnCooldownMinutes: Number(f.earnCooldownMinutes),
        dailyEarnCap: Number(f.dailyEarnCap),
        expiryDays: f.expiryDays ? Number(f.expiryDays) : null,
        active: f.active,
      },
    }),
    { success: program ? "Programme saved" : "Programme created", error: "Could not save programme" },
  );

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Programme settings</CardTitle>
        <label className="flex items-center gap-2 text-sm">
          <span>{form.active ? "Running" : "Paused"}</span>
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        </label>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
          <div>
            <Label>Model</Label>
            <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v === "stamps" ? "stamps" : "points" })}>
              <SelectTrigger className="h-11 max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Points</SelectItem>
                <SelectItem value="stamps">Stamps</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {NUMBERS.map((n) => (
              <div key={n.key}>
                <Label htmlFor={`prog-${n.key}`}>{n.label}</Label>
                <Input
                  id={`prog-${n.key}`}
                  type="number"
                  min={0}
                  step={n.step}
                  inputMode={n.step ? "decimal" : "numeric"}
                  className="h-11"
                  value={form[n.key]}
                  onChange={(e) => setForm({ ...form, [n.key]: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">{n.hint}</p>
              </div>
            ))}
          </div>
          <Button type="submit" className="h-11" disabled={save.isPending}>
            {save.isPending ? "Saving" : program ? "Save settings" : "Create programme"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
