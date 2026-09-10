import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CARD, EmptyNote, Panel, SectionTitle, Skeleton } from "./portal-ui";
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

  const everyone = data.audiences.find((a) => a.audience === "all");
  const left = Math.max(0, data.limits.monthlyCap - data.sentThisMonth);

  return (
    <div className="space-y-3">
      {/*
        The two numbers that decide whether to send today, before the form: how
        many people it would reach, and how many sends are left this month. Both
        are already in the payload; the composer just never showed them.
      */}
      <div className={`${CARD} p-5 flex flex-col sm:flex-row sm:items-center gap-5`}>
        <div className="flex items-baseline gap-3 shrink-0">
          <span className="font-display font-extrabold text-[44px] leading-none tracking-[-0.03em] text-sea tabular-nums">
            {everyone?.suppressed || everyone?.size === null ? "—" : everyone?.size ?? "—"}
          </span>
          <span className="font-display font-bold text-lg text-slate-brand">
            {everyone?.size === 1 ? "member" : "members"}
          </span>
        </div>
        <p className="text-sm text-slate-brand flex-1 min-w-0">
          {everyone?.suppressed
            ? `Too few members to report a count yet. It appears once there are ${everyone.minimum}.`
            : "would get this. You can narrow it to people who have starred you or redeemed with you before."}
        </p>
        <div className="shrink-0 text-right">
          <p className="font-display font-extrabold text-2xl leading-none tracking-[-0.02em] text-sea tabular-nums">
            {left} of {data.limits.monthlyCap}
          </p>
          <p className="text-xs text-slate-brand mt-1">sends left this month</p>
        </div>
      </div>

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
