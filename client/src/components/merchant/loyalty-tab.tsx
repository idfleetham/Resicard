import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPounds } from "@/components/resident/format";
import { StaffEarningTool } from "@/components/loyalty/staff-earning-tool";
import { PROGRAM_KEY, type LoyaltyProgramData } from "./loyalty/types";

export default function LoyaltyTab() {
  const { data, isLoading } = useQuery<LoyaltyProgramData | null>({ queryKey: [...PROGRAM_KEY] });
  const program = data?.program;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Loyalty programme</CardTitle>
          {program && (
            program.active
              ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Running</Badge>
              : <Badge variant="secondary">Paused</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-16 bg-slate-100 rounded animate-pulse" />
          ) : !program ? (
            <p className="text-sm text-slate-600">
              You have not set up a loyalty programme. Residents earn points automatically each time they redeem, and you can add tiers and rewards.
            </p>
          ) : (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><dt className="text-slate-500">Model</dt><dd className="font-medium capitalize">{program.model}</dd></div>
              <div><dt className="text-slate-500">Points per £1</dt><dd className="font-medium">{program.pointsPerCurrency}</dd></div>
              <div><dt className="text-slate-500">Points per scan</dt><dd className="font-medium">{program.pointsPerRedemption}</dd></div>
              <div><dt className="text-slate-500">Minimum spend to earn</dt><dd className="font-medium">{formatPounds(program.minBasketEarn)}</dd></div>
              <div><dt className="text-slate-500">Tiers</dt><dd className="font-medium">{data?.tiers.length ?? 0}</dd></div>
              <div><dt className="text-slate-500">Rewards</dt><dd className="font-medium">{data?.rewards.filter((r) => r.active).length ?? 0} active</dd></div>
            </dl>
          )}
          <Button asChild className="h-11">
            <Link href="/merchant/loyalty">{program ? "Manage programme" : "Set up loyalty"}</Link>
          </Button>
        </CardContent>
      </Card>

      {program?.active && <StaffEarningTool />}
    </div>
  );
}
