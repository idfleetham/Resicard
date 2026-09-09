import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { LoyaltyTier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLoyaltyMutation } from "./use-loyalty";
import { INPUT, SectionTitle } from "../portal-ui";

const LABEL = "text-xs text-slate-brand";

interface TierForm {
  name: string;
  thresholdPoints: string;
  hasDiscount: boolean;
  discountPercent: string;
  pointsMultiplier: string;
  color: string;
}

const EMPTY: TierForm = {
  name: "",
  thresholdPoints: "0",
  hasDiscount: false,
  discountPercent: "10",
  pointsMultiplier: "1.00",
  color: "#E4572E",
};

function fromTier(t: LoyaltyTier): TierForm {
  return {
    name: t.name,
    thresholdPoints: String(t.thresholdPoints),
    hasDiscount: Boolean(t.discountPercent),
    discountPercent: String(t.discountPercent || 10),
    pointsMultiplier: Number(t.pointsMultiplier ?? "1").toFixed(2),
    color: t.color ?? "#E4572E",
  };
}

function toBody(f: TierForm, sortOrder: number) {
  return {
    name: f.name,
    thresholdPoints: Number(f.thresholdPoints),
    discountPercent: f.hasDiscount ? Number(f.discountPercent) : null,
    pointsMultiplier: Number(f.pointsMultiplier || 1).toFixed(2),
    color: f.color,
    sortOrder,
  };
}

function tierSummary(t: LoyaltyTier): string {
  const parts = [`From ${t.thresholdPoints} points`];
  if (t.discountPercent) parts.push(`${t.discountPercent}% discount`);
  parts.push(`${Number(t.pointsMultiplier ?? 1).toFixed(2)}x points`);
  return parts.join(" · ");
}

export default function TiersEditor({ tiers, enabled }: { tiers: LoyaltyTier[]; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyTier | null>(null);
  const [form, setForm] = useState<TierForm>(EMPTY);
  const sorted = [...tiers].sort((a, b) => a.thresholdPoints - b.thresholdPoints);

  const save = useLoyaltyMutation<{ id?: string; form: TierForm }>(
    ({ id, form: f }) => ({
      method: id ? "PUT" : "POST",
      url: id ? `/api/loyalty/tiers/${id}` : "/api/loyalty/tiers",
      body: toBody(f, id ? tiers.find((t) => t.id === id)?.sortOrder ?? 0 : tiers.length),
    }),
    { success: "Tier saved", error: "Could not save tier" },
  );
  const remove = useLoyaltyMutation<string>(
    (id) => ({ method: "DELETE", url: `/api/loyalty/tiers/${id}` }),
    { success: "Tier removed", error: "Could not remove tier" },
  );

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (t: LoyaltyTier) => { setEditing(t); setForm(fromTier(t)); setOpen(true); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save.mutateAsync({ id: editing?.id, form });
    setOpen(false);
  };
  const set = (k: keyof TierForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="bg-white rounded-2xl border border-hairline p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <SectionTitle>Tiers</SectionTitle>
          <p className="text-xs text-slate-brand mt-1">Residents move up as they collect points. Offers can be limited to a tier.</p>
        </div>
        <Button variant="outline" className="h-11 px-4 shrink-0 bg-white" onClick={openNew} disabled={!enabled}><Plus className="h-4 w-4" /> Add tier</Button>
      </div>
      {!enabled ? (
        <p className="text-sm text-slate-brand">Create the programme first.</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-brand">No tiers yet. Everyone earns at the base rate.</p>
      ) : (
        <ul className="divide-y divide-[#E6E9E8]">
          {sorted.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color ?? "#E4572E" }} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sea">{t.name}</p>
                <p className="text-sm text-slate-brand">{tierSummary(t)}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-brand" aria-label="Edit" onClick={() => openEdit(t)}><Pencil className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-brand hover:text-[#B5321A]" aria-label="Remove" onClick={() => remove.mutate(t.id)} disabled={remove.isPending}><Trash2 className="h-5 w-5" /></Button>
            </li>
          ))}
        </ul>
      )}
      {enabled && (
        <p className="text-xs text-slate-brand mt-3">Give a tier something to claim by adding a reward below and limiting it to the tier.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">{editing ? "Edit tier" : "New tier"}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div className="space-y-1"><Label htmlFor="tier-name" className={LABEL}>Name</Label><Input id="tier-name" className={INPUT} value={form.name} onChange={set("name")} required placeholder="Regular" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="tier-th" className={LABEL}>Threshold (points)</Label><Input id="tier-th" type="number" min={0} className={INPUT} value={form.thresholdPoints} onChange={set("thresholdPoints")} required /></div>
              <div className="space-y-1"><Label htmlFor="tier-mult" className={LABEL}>Points multiplier</Label><Input id="tier-mult" type="number" min={0.1} step="0.05" className={INPUT} value={form.pointsMultiplier} onChange={set("pointsMultiplier")} /></div>
              <div className="space-y-1 col-span-2"><Label htmlFor="tier-col" className={LABEL}>Colour</Label><Input id="tier-col" type="color" className={`${INPUT} p-1`} value={form.color} onChange={set("color")} /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="tier-has-disc" className="text-sm font-bold text-sea">Flat discount for this tier</Label>
                <Switch id="tier-has-disc" checked={form.hasDiscount} onCheckedChange={(v) => setForm({ ...form, hasDiscount: v })} />
              </div>
              {form.hasDiscount && (
                <div className="space-y-1"><Label htmlFor="tier-disc" className={LABEL}>Discount (%)</Label><Input id="tier-disc" type="number" min={1} max={100} className={INPUT} value={form.discountPercent} onChange={set("discountPercent")} required /></div>
              )}
              <p className="text-xs text-slate-brand">Anything else you want to give this tier, add as a reward limited to it.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="h-12 px-6 bg-white" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="buoy" className="h-12 px-6" disabled={save.isPending}>{save.isPending ? "Saving" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
