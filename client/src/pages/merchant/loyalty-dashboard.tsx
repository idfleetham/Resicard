import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequireRole } from "@/hooks/use-auth";
import { useLoyaltyProgram } from "@/components/merchant/loyalty/use-loyalty";
import ProgramSettings from "@/components/merchant/loyalty/program-settings";
import TiersEditor from "@/components/merchant/loyalty/tiers-editor";
import RewardsEditor from "@/components/merchant/loyalty/rewards-editor";
import MembersTable from "@/components/merchant/loyalty/members-table";
import EventsList from "@/components/merchant/loyalty/events-list";
import AnalyticsBlock from "@/components/merchant/loyalty/analytics-block";
import { StaffEarningTool } from "@/components/loyalty/staff-earning-tool";

export default function LoyaltyDashboard() {
  const { ready } = useRequireRole("merchant");
  const { data, isLoading } = useLoyaltyProgram();
  const program = data?.program ?? null;
  const enabled = !!program;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-8 space-y-4">
        <Button asChild variant="ghost" className="h-11 -ml-3">
          <Link href="/merchant?tab=loyalty"><ArrowLeft className="h-4 w-4 mr-1" /> Portal</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Loyalty programme</h1>
          <p className="text-sm text-slate-500">Points are awarded automatically when a resident redeems an offer. Staff can also award points at the till.</p>
        </div>

        {!ready || isLoading ? (
          <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
        ) : (
          <Tabs defaultValue="setup">
            <div className="overflow-x-auto -mx-4 px-4 mb-5">
              <TabsList className="h-12 inline-flex w-auto min-w-full sm:min-w-0">
                <TabsTrigger value="setup" className="h-10 px-4 text-sm sm:text-base">Set-up</TabsTrigger>
                <TabsTrigger value="members" className="h-10 px-4 text-sm sm:text-base">Members</TabsTrigger>
                <TabsTrigger value="activity" className="h-10 px-4 text-sm sm:text-base">Activity</TabsTrigger>
                <TabsTrigger value="till" className="h-10 px-4 text-sm sm:text-base">Till</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="setup" className="mt-0 space-y-5">
              <ProgramSettings program={program} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <TiersEditor tiers={data?.tiers ?? []} enabled={enabled} />
                <RewardsEditor rewards={data?.rewards ?? []} model={program?.model ?? "points"} enabled={enabled} />
              </div>
            </TabsContent>

            <TabsContent value="members" className="mt-0">
              <MembersTable />
            </TabsContent>

            <TabsContent value="activity" className="mt-0 space-y-5">
              <AnalyticsBlock />
              <EventsList />
            </TabsContent>

            <TabsContent value="till" className="mt-0">
              {enabled ? (
                <StaffEarningTool />
              ) : (
                <p className="text-sm text-slate-600">Create the programme first, then staff can award points here.</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
