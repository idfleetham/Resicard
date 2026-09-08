import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequireRole } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DigitalMembershipCard from "@/components/digital-membership-card";
import VerificationPanel from "@/components/resident/verification-panel";
import MembershipStatus from "@/components/resident/membership-status";
import { InstallPrompt } from "@/components/resident/install-prompt";
import { useMembership } from "@/components/resident/use-membership";
import ScanButton from "@/components/resident/scan-button";
import OffersTab from "@/components/resident/offers-tab";
import CardsTab from "@/components/resident/cards-tab";
import ActivityTab from "@/components/resident/activity-tab";

const TABS = ["resicard", "offers", "cards", "activity"] as const;
type Tab = (typeof TABS)[number];

// "Resicard" is the membership card, "Cards" the outlets' loyalty cards; one
// word doing both jobs was the confusing part.
const TAB_LABELS: Record<Tab, string> = { resicard: "Resicard", offers: "Offers", cards: "Cards", activity: "Activity" };

/** Older links use ?tab=history and ?tab=card; both still open the right tab. */
const TAB_ALIASES: Record<string, Tab> = { history: "activity", card: "resicard" };

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

function resolveTab(value: string | null): Tab | null {
  if (value && value in TAB_ALIASES) return TAB_ALIASES[value];
  return isTab(value) ? value : null;
}

const TAB_TRIGGER =
  "h-10 rounded-full text-[15px] font-bold text-sea data-[state=active]:bg-sea data-[state=active]:text-foam data-[state=active]:shadow-none";

export default function ResidentDashboard() {
  const { ready, user } = useRequireRole("resident");
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const membership = useMembership({ enabled: ready });

  const params = new URLSearchParams(search);
  const requestedTab = resolveTab(params.get("tab"));
  const [tab, setTab] = useState<Tab>(requestedTab ?? "resicard");
  const autoScan = params.get("scan") === "1";
  const checkout = params.get("checkout");

  useEffect(() => {
    if (requestedTab) setTab(requestedTab);
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
      <div className="min-h-screen bg-foam">
        <Navigation />
        <div className="max-w-3xl mx-auto px-5 py-6 animate-pulse space-y-4">
          <div className="h-10 bg-white rounded-xl w-1/2" />
          <div className="aspect-[1.6/1] bg-white rounded-[20px]" />
          <div className="h-14 bg-white rounded-full" />
        </div>
      </div>
    );
  }

  const changeTab = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    setLocation(value === "resicard" ? "/resident" : `/resident?tab=${value}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <main className="max-w-5xl mx-auto px-5 sm:px-6 py-6 sm:py-10">
        <h1 className="font-display font-extrabold text-[42px] leading-none tracking-[-0.03em] mb-5">
          Hello, {user.firstName || user.username}
        </h1>

        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-grid h-12 p-1 mb-5 rounded-full bg-white">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className={`${TAB_TRIGGER} sm:px-6`}>
                {TAB_LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="resicard" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="flex flex-col gap-3">
                <DigitalMembershipCard user={user} membership={membership.data ?? null} />
                <ScanButton autoOpen={autoScan} />
                <p className="text-xs text-slate-brand text-center px-4">
                  At the outlet, scan the Resicard code at the till and pick an offer. Show the green screen to staff.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <VerificationPanel />
                <MembershipStatus />
                <InstallPrompt />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="offers" className="mt-0">
            <OffersTab />
          </TabsContent>

          <TabsContent value="cards" className="mt-0">
            <CardsTab />
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <ActivityTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
