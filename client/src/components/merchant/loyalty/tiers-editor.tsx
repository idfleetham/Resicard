import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { LoyaltyTier } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLoyaltyMutation } from "./use-loyalty";

interface TierForm {
  name: string;
  thresholdPoints: string;
  discountPercent: string;
  pointsMultiplier: string;
  color: string;
}

const EMPTY: TierForm = { name: "", thresholdPoints: "0", discountPercent: "0", pointsMultiplier: "1.00", color: "#f97316" };

function fromTier(t: LoyaltyTier): TierForm {
  return {
    name: t.name,
    thresholdPoints: String(t.thresholdPoints),
    discountPercent: String(t.discountPercent ?? 0),
    pointsMultiplier: Number(t.pointsMultiplier ?? "1").toFixed(2),
    color: t.color ?? "#f97316",
  };
}

function toBody(f: TierForm, sortOrder: number) {
  return {
    name: f.name,
    thresholdPoints: Number(f.thresholdPoints),
    discountPercent: Number(f.discountPercent),
    pointsMultiplier: Number(f.pointsMultiplier || 1).toFixed(2),
    color: f.color,
    sortOrder,
  };
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
  const set = (k: keyof TierForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Tiers</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Residents move up as they collect points. Offers can be limited to a tier.</p>
        </div>
        <Button className="h-11 shrink-0" onClick={openNew} disabled={!enabled}><Plus className="h-4 w-4 mr-1" /> Add tier</Button>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <p className="text-sm text-slate-500">Create the programme first.</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-500">No tiers yet. Everyone earns at the base rate.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sorted.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: t.color ?? "#f97316" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">
                    From {t.thresholdPoints} points · {t.discountPercent ?? 0}% discount · {Number(t.pointsMultiplier ?? 1).toFixed(2)}x points
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Edit" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-11 w-11 text-red-600" aria-label="Remove" onClick={() => remove.mutate(t.id)} disabled={remove.isPending}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit tier" : "New tier"}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div><Label htmlFor="tier-name">Name</Label><Input id="tier-name" className="h-11" value={form.name} onChange={set("name")} required placeholder="Regular" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="tier-th">Threshold (points)</Label><Input id="tier-th" type="number" min={0} className="h-11" value={form.thresholdPoints} onChange={set("thresholdPoints")} required /></div>
              <div><Label htmlFor="tier-disc">Discount (%)</Label><Input id="tier-disc" type="number" min={0} max={100} className="h-11" value={form.discountPercent} onChange={set("discountPercent")} /></div>
              <div><Label htmlFor="tier-mult">Points multiplier</Label><Input id="tier-mult" type="number" min={0.1} step="0.05" className="h-11" value={form.pointsMultiplier} onChange={set("pointsMultiplier")} /></div>
              <div><Label htmlFor="tier-col">Colour</Label><Input id="tier-col" type="color" className="h-11 p-1" value={form.color} onChange={set("color")} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-11" disabled={save.isPending}>{save.isPending ? "Saving" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
