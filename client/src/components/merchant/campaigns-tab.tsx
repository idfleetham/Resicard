import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { EmptyNote, Panel, SectionTitle, Skeleton } from "./portal-ui";
import CampaignComposer from "./campaigns/composer";
import CampaignHistory from "./campaigns/history";
import type { CampaignsResponse } from "./campaigns/types";

/**
 * The Send tab: a live offer, one line, and a choice of audience. On Free it is
 * the pitch for Standard, which is most of the reason Standard exists.
 */

function UpgradePanel({ message }: { message: string }) {
  return (
    <Panel className="space-y-4 max-w-xl">
      <SectionTitle>Send an offer to residents</SectionTitle>
      <p className="text-sm text-slate-brand">
        {message} Pick an offer that is live, write one line, and it goes to members' phones. One a week, four a month,
        and never late at night, so it stays something residents are glad to get.
      </p>
      <Button asChild variant="buoy" className="h-12 px-6">
        <Link href="/merchant?tab=plan">See the plans</Link>
      </Button>
    </Panel>
  );
}

export default function CampaignsTab() {
  const { data, isLoading } = useQuery<CampaignsResponse>({ queryKey: ["/api/merchant/campaigns"] });

  if (isLoading || !data) return <Skeleton className="h-64" />;
  if (!data.allowed) return <UpgradePanel message={data.planMessage ?? "This is part of Standard and Insight."} />;

  return (
    <div className="space-y-3">
      {!data.pushConfigured && (
        <EmptyNote>
          Notifications are not switched on for this deployment yet, so a campaign will only reach members who have
          opted in to email. Ask Resicard to set the notification keys.
        </EmptyNote>
      )}
      <CampaignComposer data={data} />
      <CampaignHistory campaigns={data.campaigns} />
    </div>
  );
}
