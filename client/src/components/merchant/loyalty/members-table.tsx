import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/components/resident/format";
import { useLoyaltyMutation } from "./use-loyalty";
import type { LoyaltyMember } from "./types";

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
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 gap-3">
        <CardTitle className="text-lg">Members ({members.length})</CardTitle>
        <Input placeholder="Search by alias" className="h-11 max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
      </CardHeader>
      <CardContent className="p-0 sm:p-4 sm:pt-0">
        {isLoading ? (
          <div className="p-4 animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}</div>
        ) : shown.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No members yet. Residents join automatically when they redeem an offer.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Stamps</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell>
                      <div className="font-medium">{m.customerAlias}</div>
                      <div className="text-xs text-slate-500">#{m.userId}</div>
                    </TableCell>
                    <TableCell>{m.tierName ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium">{m.points}</TableCell>
                    <TableCell className="text-right">{m.stamps}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.lastActivity ? formatDate(m.lastActivity) : "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-10" onClick={() => setTarget(m)}>Adjust</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust points for {target?.customerAlias}</DialogTitle>
            <DialogDescription>Current balance: {target?.points ?? 0} points. Use a negative number to deduct.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div><Label htmlFor="adj-amount">Amount</Label><Input id="adj-amount" type="number" className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
            <div><Label htmlFor="adj-reason">Reason</Label><Input id="adj-reason" className="h-11" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Goodwill after a mix-up" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setTarget(null)}>Cancel</Button>
              <Button type="submit" className="h-11" disabled={adjust.isPending || !amount || !reason}>{adjust.isPending ? "Saving" : "Apply"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
