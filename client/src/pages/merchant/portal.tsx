import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequireRole } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import OverviewTab from "@/components/merchant/overview-tab";
import OffersManager from "@/components/merchant/offers-manager";
import RedemptionsFeed from "@/components/merchant/redemptions-feed";
import LoyaltyTab from "@/components/merchant/loyalty-tab";
import AnalyticsTab from "@/components/merchant/analytics-tab";
import CampaignsTab from "@/components/merchant/campaigns-tab";
import QrCodeTab from "@/components/merchant/qr-code-tab";
import TeamManagement from "@/components/merchant/team-management";
import MerchantSettings from "@/components/merchant/merchant-settings";
import VerifyResident from "@/components/merchant/verify-resident";
import PlanTab, { invalidatePlanGated } from "@/components/merchant/plan-tab";
import { TAB_LIST, TAB_TRIGGER, TabScroller } from "@/components/merchant/portal-ui";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "offers", label: "Offers" },
  { key: "redemptions", label: "Redemptions" },
  { key: "verify", label: "Verify" },
  { key: "loyalty", label: "Loyalty" },
  { key: "send", label: "Send" },
  { key: "analytics", label: "Analytics" },
  { key: "qr", label: "QR code" },
  { key: "team", label: "Team" },
  { key: "settings", label: "Settings" },
  { key: "plan", label: "Plan" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function isTab(value: string | null): value is Tab {
  return TABS.some((t) => t.key === value);
}

function StatusNotice({ status }: { status: "pending" | "approved" | "rejected" | null }) {
  if (status === "pending") {
    return (
      <div className="mb-5 rounded-2xl bg-sand p-5 text-sm text-sea">
        Your application is being reviewed. You can prepare offers now; residents will see them once you are approved.
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="mb-5 rounded-2xl bg-[#FBE9E7] p-5 text-sm text-[#B5321A]">
        Your application was not approved. Contact Resicard if you think this is a mistake.
      </div>
    );
  }
  return null;
}

export default function MerchantPortal() {
  const { ready, user } = useRequireRole("merchant");
  const search = useSearch();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(search);
  const requestedTab = params.get("tab");
  const onPlanRoute = location.startsWith("/merchant/plan");
  const initial: Tab = onPlanRoute ? "plan" : isTab(requestedTab) ? requestedTab : "overview";
  const [tab, setTab] = useState<Tab>(initial);
  const checkout = params.get("checkout");

  useEffect(() => {
    if (onPlanRoute) setTab("plan");
    else if (isTab(requestedTab)) setTab(requestedTab);
  }, [requestedTab, onPlanRoute]);

  useEffect(() => {
    if (!checkout || !ready) return;
    if (checkout === "success") {
      toast({ title: "Payment received", description: "Your new plan is now active." });
      void invalidatePlanGated(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } else if (checkout === "cancelled") {
      toast({ title: "Payment cancelled", description: "You have not been charged.", variant: "destructive" });
    }
    setLocation("/merchant?tab=plan", { replace: true });
  }, [checkout, ready, toast, queryClient, setLocation]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-mist">
        <Navigation />
        <div className="max-w-6xl mx-auto px-5 py-6 animate-pulse space-y-4">
          <div className="h-10 bg-white rounded-xl w-1/3" />
          <div className="h-12 bg-white rounded-full w-2/3" />
          <div className="h-40 bg-white rounded-2xl" />
        </div>
      </div>
    );
  }

  const merchant = user.merchant ?? null;
  // Verifying residents is granted per outlet by an admin, so the tab only
  // exists for an outlet that has been given it.
  const tabs = TABS.filter((t) => t.key !== "verify" || merchant?.verifiesResidents);
  const changeTab = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    setLocation(value === "overview" ? "/merchant" : `/merchant?tab=${value}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-mist text-sea">
      <Navigation />
      <main className="max-w-6xl mx-auto px-5 sm:px-6 py-5 sm:py-6">
        <Tabs value={tabs.some((t) => t.key === tab) ? tab : "overview"} onValueChange={changeTab}>
          {/*
            The header used to be a "MERCHANT PORTAL" label, the outlet name at
            42px and then the tab row: about 190px at the top of every one of the
            ten tabs, which is a fifth of a laptop screen spent saying the same
            thing, and it made every tab open identically. The label is gone and
            the name is half the size. Ten tabs will not share a line with a name
            at 1280px, so they stay stacked rather than clipping.
          */}
          <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] leading-none tracking-[-0.03em] mb-3">
            {merchant?.name ?? "Your outlet"}
          </h1>
          <TabScroller>
            <TabsList className={TAB_LIST}>
              {tabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className={TAB_TRIGGER}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </TabScroller>

          <StatusNotice status={merchant?.status ?? null} />

          <TabsContent value="overview" className="mt-0"><OverviewTab onGoTo={changeTab} /></TabsContent>
          <TabsContent value="offers" className="mt-0"><OffersManager /></TabsContent>
          <TabsContent value="redemptions" className="mt-0"><RedemptionsFeed /></TabsContent>
          {merchant?.verifiesResidents && <TabsContent value="verify" className="mt-0"><VerifyResident /></TabsContent>}
          <TabsContent value="loyalty" className="mt-0"><LoyaltyTab merchantName={merchant?.name ?? "Your outlet"} /></TabsContent>
          <TabsContent value="send" className="mt-0"><CampaignsTab /></TabsContent>
          <TabsContent value="analytics" className="mt-0"><AnalyticsTab /></TabsContent>
          <TabsContent value="qr" className="mt-0"><QrCodeTab merchantName={merchant?.name ?? "Your outlet"} /></TabsContent>
          <TabsContent value="team" className="mt-0"><TeamManagement /></TabsContent>
          <TabsContent value="settings" className="mt-0"><MerchantSettings /></TabsContent>
          <TabsContent value="plan" className="mt-0"><PlanTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
