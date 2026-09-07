import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate, formatPounds } from "@/components/resident/format";

export interface PlanInfo {
  planStatus: "trial" | "active" | "inactive";
  planStartedAt: string | null;
  planRenewsAt: string | null;
  monthlyFee: number;
  currency: string;
  trialDays: number;
}

type CheckoutResponse = { url: string } | { activated: true };

export default function PlanTab() {
  const { toast } = useToast();
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const { data: plan, isLoading } = useQuery<PlanInfo>({ queryKey: ["/api/merchant/plan"] });

  const checkout = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/merchant/plan/checkout")).json() as Promise<CheckoutResponse>,
    onSuccess: async (res) => {
      if ("url" in res) {
        window.location.href = res.url;
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/merchant/plan"] });
      await refresh();
      toast({ title: "Plan active", description: "Your monthly plan is now active." });
    },
    onError: (err) => toast({ title: "Payment could not start", description: errorMessage(err), variant: "destructive" }),
  });

  if (isLoading || !plan) {
    return <Card><CardContent className="p-6 animate-pulse h-32 bg-slate-100 rounded-xl" /></Card>;
  }

  const badge =
    plan.planStatus === "active" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
    ) : plan.planStatus === "trial" ? (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Trial</Badge>
    ) : (
      <Badge variant="destructive">Inactive</Badge>
    );

  return (
    <Card className="max-w-xl">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Your plan</CardTitle>
        {badge}
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-500">Monthly fee</dt>
          <dd className="font-medium">{formatPounds(plan.monthlyFee)} a month</dd>
          {plan.planStartedAt && (
            <>
              <dt className="text-slate-500">Started</dt>
              <dd>{formatDate(plan.planStartedAt)}</dd>
            </>
          )}
          {plan.planRenewsAt && (
            <>
              <dt className="text-slate-500">{plan.planStatus === "trial" ? "Trial ends" : "Renews"}</dt>
              <dd>{formatDate(plan.planRenewsAt)}</dd>
            </>
          )}
        </dl>

        <p className="text-sm text-slate-600">
          {plan.planStatus === "trial"
            ? `Your ${plan.trialDays}-day trial includes everything. Set up payment before it ends so residents can keep redeeming.`
            : plan.planStatus === "active"
              ? "One flat fee. No charge per redemption."
              : "Residents cannot redeem your offers while the plan is inactive."}
        </p>

        {plan.planStatus !== "active" && (
          <Button className="h-12 w-full sm:w-auto" onClick={() => checkout.mutate()} disabled={checkout.isPending}>
            {checkout.isPending ? "Starting" : "Set up payment"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
