import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { LoyaltyReward, LoyaltyTier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLoyaltyMutation } from "./use-loyalty";
import { INPUT, Pill, SectionTitle } from "../portal-ui";

const LABEL = "text-xs text-slate-brand";
const EVERYONE = "everyone";

type ClaimRule = NonNullable<LoyaltyReward["claimRule"]>;

const CLAIM_RULES: { value: ClaimRule; label: string; short: string }[] = [
  { value: "unlimited", label: "As often as they like", short: "unlimited" },
  { value: "once", label: "Once only", short: "once" },
  { value: "weekly", label: "Once a week", short: "weekly" },
  { value: "monthly", label: "Once a month", short: "monthly" },
];

interface RewardForm {
  name: string;
  costPoints: string;
  /** A tier id, or EVERYONE. */
  tierId: string;
  claimRule: ClaimRule;
  terms: string;
  active: boolean;
}

const EMPTY: RewardForm = { name: "", costPoints: "", tierId: EVERYONE, claimRule: "unlimited", terms: "", active: true };

function fromReward(r: LoyaltyReward): RewardForm {
  return {
    name: r.name,
    costPoints: r.costPoints ? String(r.costPoints) : "",
    tierId: r.tierId ?? EVERYONE,
    claimRule: r.claimRule ?? "unlimited",
    terms: r.terms ?? "",
    active: r.active ?? true,
  };
}

function isTierBenefit(r: LoyaltyReward): boolean {
  return Boolean(r.tierId) && !r.costPoints;
}

function ruleShort(rule: LoyaltyReward["claimRule"]): string {
  return CLAIM_RULES.find((c) => c.value === (rule ?? "unlimited"))?.short ?? "unlimited";
}

interface Props {
  rewards: LoyaltyReward[];
  tiers: LoyaltyTier[];
  enabled: boolean;
}

export default function RewardsEditor({ rewards, tiers, enabled }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyReward | null>(null);
  const [form, setForm] = useState<RewardForm>(EMPTY);
  const sortedTiers = [...tiers].sort((a, b) => a.thresholdPoints - b.thresholdPoints);
  const tierName = (id: string | null) => tiers.find((t) => t.id === id)?.name ?? "a tier";

  const save = useLoyaltyMutation<{ id?: string; form: RewardForm }>(
    ({ id, form: f }) => ({
      method: id ? "PUT" : "POST",
      url: id ? `/api/loyalty/rewards/${id}` : "/api/loyalty/rewards",
      body: {
        name: f.name,
        costPoints: f.costPoints ? Number(f.costPoints) : null,
        tierId: f.tierId === EVERYONE ? null : f.tierId,
        claimRule: f.claimRule,
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

  const forTier = form.tierId !== EVERYONE;
  const needsCost = !forTier;

  const summary = (r: LoyaltyReward) => {
    if (isTierBenefit(r)) return `Tier benefit · ${tierName(r.tierId)} · ${ruleShort(r.claimRule)}`;
    const cost = r.costPoints ? `${r.costPoints} points` : "Free";
    const parts = [cost];
    if (r.tierId) parts.push(`${tierName(r.tierId)} and above`);
    if (r.claimRule && r.claimRule !== "unlimited") parts.push(ruleShort(r.claimRule));
    return parts.join(" · ");
  };

  const benefits = rewards.filter(isTierBenefit);
  const pointsRewards = rewards.filter((r) => !isTierBenefit(r));

  const rows = (list: LoyaltyReward[]) => (
    <ul className="divide-y divide-[#E6E9E8]">
      {list.map((r) => (
        <li key={r.id} className="flex items-center gap-3 py-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sea flex items-center gap-2">
              {r.name}
              {!r.active && <Pill tone="slate">Hidden</Pill>}
            </p>
            <p className="text-sm text-slate-brand">{summary(r)}{r.terms ? ` · ${r.terms}` : ""}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-brand" aria-label="Edit" onClick={() => openEdit(r)}><Pencil className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-brand hover:text-[#B5321A]" aria-label="Remove" onClick={() => remove.mutate(r.id)} disabled={remove.isPending}><Trash2 className="h-5 w-5" /></Button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="bg-white rounded-2xl border border-hairline p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <SectionTitle>Rewards</SectionTitle>
          <p className="text-xs text-slate-brand mt-1">What residents can spend their points on, and what each tier can claim.</p>
        </div>
        <Button variant="outline" className="h-11 px-4 shrink-0 bg-white" onClick={openNew} disabled={!enabled}><Plus className="h-4 w-4" /> Add reward</Button>
      </div>
      {!enabled ? (
        <p className="text-sm text-slate-brand">Create the programme first.</p>
      ) : rewards.length === 0 ? (
        <p className="text-sm text-slate-brand">No rewards yet. A free coffee or a pudding is a good start.</p>
      ) : (
        <div className="space-y-4">
          {benefits.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-brand">Tier benefits</p>
              {rows(benefits)}
            </div>
          )}
          {pointsRewards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-brand">Points rewards</p>
              {rows(pointsRewards)}
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">{editing ? "Edit reward" : "New reward"}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div className="space-y-1"><Label htmlFor="rw-name" className={LABEL}>Name</Label><Input id="rw-name" className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Free coffee" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={LABEL}>Who can claim</Label>
                <Select value={form.tierId} onValueChange={(v) => setForm({ ...form, tierId: v })}>
                  <SelectTrigger className={INPUT}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EVERYONE}>Everyone with points</SelectItem>
                    {sortedTiers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>Members of {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className={LABEL}>How often</Label>
                <Select value={form.claimRule} onValueChange={(v) => setForm({ ...form, claimRule: v as ClaimRule })}>
                  <SelectTrigger className={INPUT}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLAIM_RULES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label htmlFor="rw-pts" className={LABEL}>Cost (points)</Label><Input id="rw-pts" type="number" min={needsCost ? 1 : 0} className={INPUT} value={form.costPoints} onChange={(e) => setForm({ ...form, costPoints: e.target.value })} required={needsCost} placeholder={forTier ? "0" : ""} /></div>
            <p className="text-xs text-slate-brand">
              {forTier
                ? `Leave the cost at 0 to make this a free benefit for ${tierName(form.tierId)} members and above.`
                : "Residents pay with points. Limit it to a tier to make it a free benefit."}
            </p>
            <div className="space-y-1"><Label htmlFor="rw-terms" className={LABEL}>Terms</Label><Textarea id="rw-terms" rows={2} className="rounded-xl" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
            <label className="flex items-center justify-between h-12 text-sm font-bold text-sea">
              <span>Visible to residents</span>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </label>
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
