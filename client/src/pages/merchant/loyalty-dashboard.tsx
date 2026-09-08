import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import Navigation from "@/components/navigation";
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
import { LoyaltyUpgradeCard, isPlanRequired } from "@/components/merchant/loyalty/upgrade-card";
import { usePlan } from "@/components/merchant/plan-tab";
import { EmptyNote, TAB_LIST, TAB_TRIGGER, TabScroller } from "@/components/merchant/portal-ui";

const TABS = [
  { key: "setup", label: "Set-up" },
  { key: "members", label: "Members" },
  { key: "activity", label: "Activity" },
  { key: "till", label: "Till" },
];

export default function LoyaltyDashboard() {
  const { ready } = useRequireRole("merchant");
  const { data: plan, isLoading: planLoading } = usePlan();
  const gated = !!plan && !plan.features.loyalty;
  const { data, isLoading, error } = useLoyaltyProgram({ enabled: !!plan && !gated });
  const program = data?.program ?? null;
  const enabled = !!program;
  const loading = !ready || planLoading || (isLoading && !gated);

  return (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <main className="max-w-6xl mx-auto px-5 sm:px-6 py-6 sm:py-10">
        <Link href="/merchant?tab=loyalty" className="inline-flex items-center gap-1 text-sm font-bold text-slate-brand hover:text-sea mb-4">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Portal
        </Link>
        <div className="mb-5">
          <h1 className="font-display font-extrabold text-[42px] leading-none tracking-[-0.03em]">Loyalty programme</h1>
          <p className="text-sm text-slate-brand mt-2 max-w-2xl">
            Points are awarded automatically when a resident redeems an offer. Staff can also award points at the till.
          </p>
        </div>

        {loading ? (
          <div className="h-64 bg-white rounded-2xl animate-pulse" />
        ) : gated || isPlanRequired(error) ? (
          <LoyaltyUpgradeCard />
        ) : (
          <Tabs defaultValue="setup">
            <TabScroller>
              <TabsList className={TAB_LIST}>
                {TABS.map((t) => (
                  <TabsTrigger key={t.key} value={t.key} className={TAB_TRIGGER}>{t.label}</TabsTrigger>
                ))}
              </TabsList>
            </TabScroller>

            <TabsContent value="setup" className="mt-0 space-y-3">
              <ProgramSettings program={program} tiers={data?.tiers ?? []} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <TiersEditor tiers={data?.tiers ?? []} enabled={enabled} />
                <RewardsEditor rewards={data?.rewards ?? []} tiers={data?.tiers ?? []} enabled={enabled} />
              </div>
            </TabsContent>

            <TabsContent value="members" className="mt-0">
              <MembersTable />
            </TabsContent>

            <TabsContent value="activity" className="mt-0 space-y-3">
              <AnalyticsBlock />
              <EventsList />
            </TabsContent>

            <TabsContent value="till" className="mt-0">
              {enabled ? (
                <StaffEarningTool />
              ) : (
                <EmptyNote>Create the programme first, then staff can award points here.</EmptyNote>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
