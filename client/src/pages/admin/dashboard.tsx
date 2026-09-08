import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import Navigation from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequireRole } from "@/hooks/use-auth";
import StatsOverview from "@/components/admin/stats-overview";
import Postcards from "@/components/admin/postcards";
import ResidentsDesk from "@/components/admin/residents-desk";
import BusinessesTable from "@/components/admin/businesses-table";
import UsersTable from "@/components/admin/users-table";
import RedemptionsTable from "@/components/admin/redemptions-table";
import PriceChanges from "@/components/admin/price-changes";
import RevenueTab from "@/components/admin/revenue/revenue-tab";
import { TAB_LIST, TAB_TRIGGER, TabScroller } from "@/components/merchant/portal-ui";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "postcards", label: "Postcards" },
  { key: "residents", label: "Residents" },
  { key: "merchants", label: "Businesses" },
  { key: "users", label: "Users" },
  { key: "redemptions", label: "Redemptions" },
  { key: "prices", label: "Prices" },
  { key: "revenue", label: "Revenue" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function isTab(value: string | null): value is Tab {
  return TABS.some((t) => t.key === value);
}

export default function AdminDashboard() {
  const { ready, user } = useRequireRole("admin");
  const search = useSearch();
  const [, setLocation] = useLocation();
  const requestedTab = new URLSearchParams(search).get("tab");
  const [tab, setTab] = useState<Tab>(isTab(requestedTab) ? requestedTab : "overview");

  useEffect(() => {
    if (isTab(requestedTab)) setTab(requestedTab);
  }, [requestedTab]);

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

  const changeTab = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    setLocation(value === "overview" ? "/admin" : `/admin?tab=${value}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <main className="max-w-6xl mx-auto px-5 sm:px-6 py-6 sm:py-10">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-brand mb-2">Resicard St Andrews</p>
          <h1 className="font-display font-extrabold text-[42px] leading-none tracking-[-0.03em]">Admin</h1>
        </div>

        <Tabs value={tab} onValueChange={changeTab}>
          <TabScroller>
            <TabsList className={TAB_LIST}>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className={TAB_TRIGGER}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </TabScroller>

          <TabsContent value="overview" className="mt-0"><StatsOverview onGoTo={changeTab} /></TabsContent>
          <TabsContent value="postcards" className="mt-0"><Postcards /></TabsContent>
          <TabsContent value="residents" className="mt-0"><ResidentsDesk /></TabsContent>
          <TabsContent value="merchants" className="mt-0"><BusinessesTable /></TabsContent>
          <TabsContent value="users" className="mt-0"><UsersTable /></TabsContent>
          <TabsContent value="redemptions" className="mt-0"><RedemptionsTable /></TabsContent>
          <TabsContent value="prices" className="mt-0"><PriceChanges /></TabsContent>
          <TabsContent value="revenue" className="mt-0"><RevenueTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
