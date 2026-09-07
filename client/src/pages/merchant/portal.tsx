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
import QrCodeTab from "@/components/merchant/qr-code-tab";
import TeamManagement from "@/components/merchant/team-management";
import MerchantSettings from "@/components/merchant/merchant-settings";
import PlanTab, { invalidatePlanGated } from "@/components/merchant/plan-tab";
import { TAB_LIST, TAB_TRIGGER, TabScroller } from "@/components/merchant/portal-ui";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "offers", label: "Offers" },
  { key: "redemptions", label: "Redemptions" },
  { key: "loyalty", label: "Loyalty" },
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
      toast({ title: "Payment received", description: "Premium is now active." });
      void invalidatePlanGated(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } else if (checkout === "cancelled") {
      toast({ title: "Payment cancelled", description: "You have not been charged.", variant: "destructive" });
    }
    setLocation("/merchant?tab=plan", { replace: true });
  }, [checkout, ready, toast, queryClient, setLocation]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-foam">
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
  const changeTab = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    setLocation(value === "overview" ? "/merchant" : `/merchant?tab=${value}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <main className="max-w-6xl mx-auto px-5 sm:px-6 py-6 sm:py-10">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-brand mb-2">Merchant portal</p>
          <h1 className="font-display font-extrabold text-[42px] leading-none tracking-[-0.03em]">{merchant?.name ?? "Your outlet"}</h1>
        </div>

        <StatusNotice status={merchant?.status ?? null} />

        <Tabs value={tab} onValueChange={changeTab}>
          <TabScroller>
            <TabsList className={TAB_LIST}>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className={TAB_TRIGGER}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </TabScroller>

          <TabsContent value="overview" className="mt-0"><OverviewTab onGoTo={changeTab} /></TabsContent>
          <TabsContent value="offers" className="mt-0"><OffersManager /></TabsContent>
          <TabsContent value="redemptions" className="mt-0"><RedemptionsFeed /></TabsContent>
          <TabsContent value="loyalty" className="mt-0"><LoyaltyTab /></TabsContent>
          <TabsContent value="qr" className="mt-0"><QrCodeTab merchantName={merchant?.name ?? "outlet"} /></TabsContent>
          <TabsContent value="team" className="mt-0"><TeamManagement /></TabsContent>
          <TabsContent value="settings" className="mt-0"><MerchantSettings /></TabsContent>
          <TabsContent value="plan" className="mt-0"><PlanTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
