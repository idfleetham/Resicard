import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";

interface EarnResponse {
  points?: number;
  pointsAwarded?: number;
  balance?: { points?: number } | number;
  tierName?: string | null;
  customerAlias?: string;
}

function awarded(res: EarnResponse): number {
  return res.pointsAwarded ?? res.points ?? 0;
}

function balanceOf(res: EarnResponse): number | null {
  if (typeof res.balance === "number") return res.balance;
  if (res.balance && typeof res.balance.points === "number") return res.balance.points;
  return null;
}

/** Award loyalty points for a purchase made without an offer (staff use, needs a PIN). */
export function StaffEarningTool() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [staffPin, setStaffPin] = useState("");
  const [customer, setCustomer] = useState("");
  const [basket, setBasket] = useState("");
  const [last, setLast] = useState<{ points: number; balance: number | null } | null>(null);

  const earn = useMutation({
    mutationFn: async () => {
      const trimmed = customer.trim();
      const body: Record<string, unknown> = { staffPin, basketAmount: Number(basket) };
      if (/^\d+$/.test(trimmed)) body.userId = Number(trimmed);
      else body.redemptionCode = trimmed.toUpperCase();
      return (await apiRequest("POST", "/api/loyalty/earn", body)).json() as Promise<EarnResponse>;
    },
    onSuccess: async (res) => {
      setLast({ points: awarded(res), balance: balanceOf(res) });
      setCustomer("");
      setBasket("");
      await queryClient.invalidateQueries({ queryKey: ["/api/loyalty/members"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/loyalty/events"] });
    },
    onError: (err) => toast({ title: "Points not awarded", description: errorMessage(err), variant: "destructive" }),
  });

  const canSubmit = /^\d{4}$/.test(staffPin) && customer.trim().length > 0 && Number(basket) > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Award points at the till</CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          For purchases without an offer. Enter the code from the resident's last redemption here, or their member number.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); earn.mutate(); }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="earn-pin">Staff PIN</Label>
              <Input id="earn-pin" type="password" inputMode="numeric" maxLength={4} className="h-12 text-lg tracking-widest" value={staffPin} onChange={(e) => setStaffPin(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="earn-customer">Redemption code or member number</Label>
              <Input id="earn-customer" className="h-12 text-lg uppercase" placeholder="ABC234" value={customer} onChange={(e) => setCustomer(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="earn-basket">Bill total (£)</Label>
              <Input id="earn-basket" type="number" min={0} step="0.01" inputMode="decimal" className="h-12 text-lg" value={basket} onChange={(e) => setBasket(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="h-12 w-full sm:w-auto" disabled={!canSubmit || earn.isPending}>
            {earn.isPending ? "Awarding" : "Award points"}
          </Button>
        </form>
        {last && (
          <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-2xl font-bold text-green-800">{last.points} points awarded</p>
            {last.balance !== null && <p className="text-sm text-green-700">New balance: {last.balance} points</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StaffEarningTool;
