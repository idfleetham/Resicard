import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { errorCode } from "@/components/resident/format";
import { SectionTitle } from "../portal-ui";

/** True when a gated query failed with the plan 403. */
export function isPlanRequired(err: unknown): boolean {
  return errorCode(err) === "plan_required";
}

/** Shown in place of the loyalty programme UI when the business is on Free. */
export function LoyaltyUpgradeCard() {
  return (
    <div className="bg-white rounded-2xl p-5 space-y-4 max-w-xl">
      <SectionTitle>Loyalty programme</SectionTitle>
      <p className="text-sm text-slate-brand">
        The loyalty programme is part of Standard and Insight. Residents earn points or stamps each time they redeem with
        you, and you can add tiers and rewards to bring them back. Both plans also lift the live offer limit.
      </p>
      <Button asChild variant="buoy" className="h-12 px-6">
        <Link href="/merchant?tab=plan">See the plans</Link>
      </Button>
    </div>
  );
}
