import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequireRole } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DigitalMembershipCard from "@/components/digital-membership-card";
import DocumentVerification from "@/components/document-verification";
import MembershipStatus from "@/components/resident/membership-status";
import ScanButton from "@/components/resident/scan-button";
import OffersTab from "@/components/resident/offers-tab";
import HistoryTab from "@/components/resident/history-tab";

const TABS = ["card", "offers", "history"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export default function ResidentDashboard() {
  const { ready, user } = useRequireRole("resident");
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(search);
  const requestedTab = params.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(requestedTab) ? requestedTab : "card");
  const autoScan = params.get("scan") === "1";
  const checkout = params.get("checkout");

  useEffect(() => {
    if (isTab(requestedTab)) setTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    if (!checkout || !ready) return;
    if (checkout === "success") {
      toast({ title: "Payment received", description: "Your annual membership is now active." });
      void queryClient.invalidateQueries({ queryKey: ["/api/membership"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } else if (checkout === "cancelled") {
      toast({ title: "Payment cancelled", description: "You have not been charged.", variant: "destructive" });
    }
    setLocation("/resident", { replace: true });
  }, [checkout, ready, toast, queryClient, setLocation]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-3xl mx-auto p-4 animate-pulse space-y-4">
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-16 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const changeTab = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    setLocation(value === "card" ? "/resident" : `/resident?tab=${value}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Hello, {user.firstName || user.username}</h1>
        </div>

        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList className="grid grid-cols-3 w-full h-12 mb-5">
            <TabsTrigger value="card" className="text-base h-10">Card</TabsTrigger>
            <TabsTrigger value="offers" className="text-base h-10">Offers</TabsTrigger>
            <TabsTrigger value="history" className="text-base h-10">History</TabsTrigger>
          </TabsList>

          <TabsContent value="card" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <DigitalMembershipCard user={user} />
                <ScanButton autoOpen={autoScan} />
                <p className="text-sm text-slate-600 text-center">
                  At the outlet, scan the Resicard code at the till and pick an offer. Show the green screen to staff.
                </p>
              </div>
              <div className="space-y-4">
                <DocumentVerification />
                <MembershipStatus />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="offers" className="mt-0">
            <OffersTab />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <HistoryTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
