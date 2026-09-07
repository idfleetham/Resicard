import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { LoyaltyReward } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLoyaltyMutation } from "./use-loyalty";

interface RewardForm {
  name: string;
  costPoints: string;
  costStamps: string;
  terms: string;
  active: boolean;
}

const EMPTY: RewardForm = { name: "", costPoints: "", costStamps: "", terms: "", active: true };

function fromReward(r: LoyaltyReward): RewardForm {
  return {
    name: r.name,
    costPoints: r.costPoints ? String(r.costPoints) : "",
    costStamps: r.costStamps ? String(r.costStamps) : "",
    terms: r.terms ?? "",
    active: r.active ?? true,
  };
}

export default function RewardsEditor({ rewards, model, enabled }: { rewards: LoyaltyReward[]; model: "points" | "stamps"; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyReward | null>(null);
  const [form, setForm] = useState<RewardForm>(EMPTY);

  const save = useLoyaltyMutation<{ id?: string; form: RewardForm }>(
    ({ id, form: f }) => ({
      method: id ? "PUT" : "POST",
      url: id ? `/api/loyalty/rewards/${id}` : "/api/loyalty/rewards",
      body: {
        name: f.name,
        costPoints: f.costPoints ? Number(f.costPoints) : null,
        costStamps: f.costStamps ? Number(f.costStamps) : null,
        terms: f.terms || null,
        active: f.active,
      },
    }),
    { success: "Reward saved", error: "Could not save reward" },
  );
  const remove = useLoyaltyMutation<string>(
    (id) => ({ method: "DELETE", url: `/api/loyalty/rewards/${id}` }),
    { success: "Reward removed", error: "Could not remove reward" },
  );

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r: LoyaltyReward) => { setEditing(r); setForm(fromReward(r)); setOpen(true); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save.mutateAsync({ id: editing?.id, form });
    setOpen(false);
  };

  const cost = (r: LoyaltyReward) =>
    [r.costPoints ? `${r.costPoints} points` : null, r.costStamps ? `${r.costStamps} stamps` : null].filter(Boolean).join(" or ") || "Free";

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Rewards</CardTitle>
          <p className="text-sm text-slate-500 mt-1">What residents can spend their {model} on.</p>
        </div>
        <Button className="h-11 shrink-0" onClick={openNew} disabled={!enabled}><Plus className="h-4 w-4 mr-1" /> Add reward</Button>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <p className="text-sm text-slate-500">Create the programme first.</p>
        ) : rewards.length === 0 ? (
          <p className="text-sm text-slate-500">No rewards yet. A free coffee or a pudding is a good start.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rewards.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">
                    {r.name}
                    {!r.active && <Badge variant="secondary" className="ml-2">Hidden</Badge>}
                  </p>
                  <p className="text-sm text-slate-500">{cost(r)}{r.terms ? ` · ${r.terms}` : ""}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Edit" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-11 w-11 text-red-600" aria-label="Remove" onClick={() => remove.mutate(r.id)} disabled={remove.isPending}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit reward" : "New reward"}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div><Label htmlFor="rw-name">Name</Label><Input id="rw-name" className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Free coffee" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="rw-pts">Cost (points)</Label><Input id="rw-pts" type="number" min={0} className="h-11" value={form.costPoints} onChange={(e) => setForm({ ...form, costPoints: e.target.value })} /></div>
              <div><Label htmlFor="rw-st">Cost (stamps)</Label><Input id="rw-st" type="number" min={0} className="h-11" value={form.costStamps} onChange={(e) => setForm({ ...form, costStamps: e.target.value })} /></div>
            </div>
            <div><Label htmlFor="rw-terms">Terms</Label><Textarea id="rw-terms" rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
            <label className="flex items-center justify-between h-11 text-sm">
              <span>Visible to residents</span>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </label>
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
