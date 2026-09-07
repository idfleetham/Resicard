import { ToastAction } from "@/components/ui/toast";

/** The "Upgrade" action for a Free-plan limit toast. */
export function upgradeToastAction(onClick: () => void) {
  return (
    <ToastAction altText="Upgrade to Premium" onClick={onClick}>
      Upgrade
    </ToastAction>
  );
}
