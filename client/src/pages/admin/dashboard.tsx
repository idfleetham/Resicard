import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import Navigation from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequireRole } from "@/hooks/use-auth";
import StatsOverview from "@/components/admin/stats-overview";
import ResidencyChecks from "@/components/admin/residency-checks";
import BusinessesTable from "@/components/admin/businesses-table";
import UsersTable from "@/components/admin/users-table";
import RedemptionsTable from "@/components/admin/redemptions-table";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "documents", label: "Residency checks" },
  { key: "merchants", label: "Businesses" },
  { key: "users", label: "Users" },
  { key: "redemptions", label: "Redemptions" },
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
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-6xl mx-auto p-4 animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
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
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
          <p className="text-sm text-slate-500">Resicard St Andrews</p>
        </div>

        <Tabs value={tab} onValueChange={changeTab}>
          <div className="overflow-x-auto -mx-4 px-4 mb-5">
            <TabsList className="h-12 inline-flex w-auto min-w-full sm:min-w-0">
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="h-10 px-4 text-sm sm:text-base">{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0"><StatsOverview onGoTo={changeTab} /></TabsContent>
          <TabsContent value="documents" className="mt-0"><ResidencyChecks /></TabsContent>
          <TabsContent value="merchants" className="mt-0"><BusinessesTable /></TabsContent>
          <TabsContent value="users" className="mt-0"><UsersTable /></TabsContent>
          <TabsContent value="redemptions" className="mt-0"><RedemptionsTable /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
