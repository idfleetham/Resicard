import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate, formatPounds } from "@/components/resident/format";

export interface MembershipInfo {
  status: "inactive" | "active" | "cancelled";
  expiry: string | null;
  annualFee: number;
  currency: string;
  canRedeem: boolean;
  reasons: string[];
}

type CheckoutResponse = { url: string } | { activated: true };

export default function MembershipStatus() {
  const { toast } = useToast();
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<MembershipInfo>({ queryKey: ["/api/membership"] });

  const refetchAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/membership"] });
    await refresh();
  };

  const checkout = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/membership/checkout")).json() as Promise<CheckoutResponse>,
    onSuccess: async (res) => {
      if ("url" in res) {
        window.location.href = res.url;
        return;
      }
      await refetchAll();
      toast({ title: "Membership active", description: "Your annual membership is now active." });
    },
    onError: (err) => toast({ title: "Payment could not start", description: errorMessage(err), variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/membership/cancel")).json(),
    onSuccess: async () => {
      await refetchAll();
      toast({ title: "Membership cancelled", description: "You can rejoin at any time." });
    },
    onError: (err) => toast({ title: "Could not cancel", description: errorMessage(err), variant: "destructive" }),
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-5 animate-pulse space-y-3">
          <div className="h-5 bg-slate-100 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-2/3" />
          <div className="h-12 bg-slate-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  const expiry = data.expiry ? new Date(data.expiry) : null;
  const live = data.status === "active" && expiry !== null && expiry.getTime() > Date.now();
  const expired = data.status === "active" && !live;

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Membership</CardTitle>
        {live ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
        ) : data.status === "cancelled" ? (
          <Badge variant="secondary">Cancelled</Badge>
        ) : expired ? (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Expired</Badge>
        ) : (
          <Badge variant="secondary">Not active</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {live ? (
          <>
            <p className="text-sm text-slate-700">
              Valid until <span className="font-semibold">{formatDate(expiry)}</span>.
            </p>
            <Button
              variant="outline"
              className="w-full h-11"
              disabled={cancel.isPending}
              onClick={() => {
                if (window.confirm("Cancel your membership? You will lose access to offers when it ends.")) cancel.mutate();
              }}
            >
              Cancel membership
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700">
              {expired
                ? "Your membership has run out. Renew to keep using Resicard."
                : "One flat fee for the year. No per-offer charges."}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{formatPounds(data.annualFee)}</span>
              <span className="text-slate-500">per year</span>
            </div>
            <Button className="w-full h-12 text-base" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
              {checkout.isPending ? "Starting payment" : expired ? "Renew annual membership" : "Pay annual membership"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
