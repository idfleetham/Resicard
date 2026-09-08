import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MiniCompare, { FeatureList, PricingLink } from "@/components/pricing/mini-compare";
import { RESIDENT_FREE_FEATURES, RESIDENT_MEMBER_FEATURES } from "@/components/pricing/plan-features";

/** The short version of each column; the full lists live in plan-features.ts. */
const FREE_SUMMARY = RESIDENT_FREE_FEATURES.slice(0, 3);
const MEMBER_SUMMARY = ["Everything in Free", ...RESIDENT_MEMBER_FEATURES.slice(0, 3)];

/** Shown to a resident on Free: the short version, with a link to the full table. */
export function FreePlanCompare() {
  return (
    <div className="flex flex-col gap-3">
      <MiniCompare free={FREE_SUMMARY} member={MEMBER_SUMMARY} />
      <PricingLink>See all pricing</PricingLink>
    </div>
  );
}

/** Shown to a paying member: collapsed, so it stays out of the way. */
export function MembershipIncludes() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-bold text-sea">
          What membership includes
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <FeatureList items={[...RESIDENT_FREE_FEATURES, ...RESIDENT_MEMBER_FEATURES]} />
        </CollapsibleContent>
      </Collapsible>
      <PricingLink>See all pricing</PricingLink>
    </div>
  );
}
