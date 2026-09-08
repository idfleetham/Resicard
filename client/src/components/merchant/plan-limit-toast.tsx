import { ToastAction } from "@/components/ui/toast";

/** The action on a Free-plan limit toast: it opens the plan tab. */
export function upgradeToastAction(onClick: () => void) {
  return (
    <ToastAction altText="See the plans" onClick={onClick}>
      See plans
    </ToastAction>
  );
}
