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
import PlanTab from "@/components/merchant/plan-tab";

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
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Your application is being reviewed. You can prepare offers now; residents will see them once you are approved.
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
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
      toast({ title: "Payment received", description: "Your monthly plan is now active." });
      void queryClient.invalidateQueries({ queryKey: ["/api/merchant/plan"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } else if (checkout === "cancelled") {
      toast({ title: "Payment cancelled", description: "You have not been charged.", variant: "destructive" });
    }
    setLocation("/merchant?tab=plan", { replace: true });
  }, [checkout, ready, toast, queryClient, setLocation]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-6xl mx-auto p-4 animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
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
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">{merchant?.name ?? "Your outlet"}</h1>
          <p className="text-sm text-slate-500">Merchant portal</p>
        </div>

        <StatusNotice status={merchant?.status ?? null} />

        <Tabs value={tab} onValueChange={changeTab}>
          <div className="overflow-x-auto -mx-4 px-4 mb-5">
            <TabsList className="h-12 inline-flex w-auto min-w-full sm:min-w-0">
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="h-10 px-4 text-sm sm:text-base">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

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
