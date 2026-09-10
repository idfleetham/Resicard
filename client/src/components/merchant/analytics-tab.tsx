import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AnalyticsDashboard, EXAMPLE_ANALYTICS, type AnalyticsData } from "./analytics";
import { DEFAULT_CHOICE, periodQuery, type PeriodChoice } from "./analytics/period-picker";
import { isPlanRequired } from "./loyalty/upgrade-card";
import { usePlan } from "./plan-tab";
import { Skeleton } from "./portal-ui";

/**
 * The Analytics tab. On Insight it shows the outlet's own numbers. On Free and on
 * Standard it shows the same dashboard filled with the example dataset, labelled as
 * such, above the Insight panel — the example is the whole pitch, so both tiers below
 * Insight see it.
 */

function InsightPanel() {
  return (
    <div className="bg-sea text-foam rounded-2xl p-5 space-y-4">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">This is Insight</h2>
      <p className="text-sm text-foam/80 max-w-xl">
        Analytics are part of Insight. You get your own version of everything above: who is coming in, when they come,
        which offers they use, and how your outlet compares with others like it in the town.
      </p>
      <Button asChild variant="buoy" className="h-12 px-6">
        <Link href="/merchant?tab=plan">See the plans</Link>
      </Button>
    </div>
  );
}

export default function AnalyticsTab() {
  const { data: plan, isLoading: planLoading } = usePlan();
  const gated = !!plan && !plan.features.analytics;
  const [choice, setChoice] = useState<PeriodChoice>(DEFAULT_CHOICE);
  // The period is part of the key, so switching it is an ordinary fetch and
  // going back to a period already looked at is instant.
  const query = periodQuery(choice);
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: [`/api/merchant/analytics?${query}`],
    enabled: !!plan && !gated,
    placeholderData: (previous) => previous,
  });

  if (planLoading) return <Skeleton className="h-40" />;

  if (gated || isPlanRequired(error)) {
    return (
      <div className="space-y-3">
        <AnalyticsDashboard data={EXAMPLE_ANALYTICS} example />
        <InsightPanel />
      </div>
    );
  }

  if (isLoading || !data) return <Skeleton className="h-64" />;

  return <AnalyticsDashboard data={data} choice={choice} onChoiceChange={setChoice} />;
}
