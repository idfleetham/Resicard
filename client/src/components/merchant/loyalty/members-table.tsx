import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/components/resident/format";
import { useLoyaltyMutation } from "./use-loyalty";
import type { LoyaltyMember } from "./types";
import { INPUT, SectionTitle, TD, TH, TR } from "../portal-ui";

const MEMBERS_KEY = "/api/loyalty/members";

export default function MembersTable() {
  const { data: members = [], isLoading } = useQuery<LoyaltyMember[]>({ queryKey: [MEMBERS_KEY] });
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<LoyaltyMember | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const adjust = useLoyaltyMutation<{ userId: number; amount: number; reason: string }>(
    ({ userId, amount: a, reason: r }) => ({ method: "POST", url: `/api/loyalty/members/${userId}/adjust`, body: { amount: a, reason: r } }),
    { success: "Balance adjusted", error: "Could not adjust balance", also: [MEMBERS_KEY, "/api/loyalty/events"] },
  );

  const shown = members.filter((m) => m.customerAlias.toLowerCase().includes(search.trim().toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    await adjust.mutateAsync({ userId: target.userId, amount: Number(amount), reason });
    setTarget(null);
    setAmount("");
    setReason("");
  };

  return (
    <div className="bg-white rounded-2xl border border-hairline p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <SectionTitle>Members ({members.length})</SectionTitle>
        <Input placeholder="Search by alias" className={`${INPUT} sm:max-w-xs`} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? (
        <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-brand">No members yet. Residents join automatically when they redeem an offer.</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E6E9E8] hover:bg-transparent">
                <TableHead className={TH}>Member</TableHead>
                <TableHead className={TH}>Tier</TableHead>
                <TableHead className={`${TH} text-right`}>Points</TableHead>
                <TableHead className={TH}>Last activity</TableHead>
                <TableHead className={TH} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((m) => (
                <TableRow key={m.userId} className={TR}>
                  <TableCell className={TD}>
                    <span className="font-bold">{m.customerAlias}</span>
                    <span className="text-xs text-slate-brand ml-2">#{m.userId}</span>
                  </TableCell>
                  <TableCell className={TD}>
                    {m.tierName ?? "-"}
                    {m.tierName && <span className="text-xs text-slate-brand ml-2 tabular-nums">{m.statusPoints} pts</span>}
                  </TableCell>
                  <TableCell className={`${TD} text-right font-bold`}>{m.points}</TableCell>
                  <TableCell className={`${TD} whitespace-nowrap`}>{m.lastActivity ? formatDate(m.lastActivity) : "-"}</TableCell>
                  <TableCell className={`${TD} text-right`}>
                    <Button variant="outline" size="sm" className="h-9 px-4 bg-white" onClick={() => setTarget(m)}>Adjust</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">Adjust points for {target?.customerAlias}</DialogTitle>
            <DialogDescription>Current balance: {target?.points ?? 0} points. Use a negative number to deduct.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div className="space-y-1"><Label htmlFor="adj-amount" className="text-xs text-slate-brand">Amount</Label><Input id="adj-amount" type="number" className={INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
            <div className="space-y-1"><Label htmlFor="adj-reason" className="text-xs text-slate-brand">Reason</Label><Input id="adj-reason" className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Goodwill after a mix-up" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="h-12 px-6 bg-white" onClick={() => setTarget(null)}>Cancel</Button>
              <Button type="submit" variant="buoy" className="h-12 px-6" disabled={adjust.isPending || !amount || !reason}>{adjust.isPending ? "Saving" : "Apply"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
