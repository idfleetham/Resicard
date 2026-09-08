import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate } from "./format";
import { useRefreshMembership, type MembershipInfo } from "./use-membership";

/** "07 Sep" for the confirm dialogs. */
function shortDate(value: string | null): string {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "your renewal date";
}

function useMembershipAction(path: string, success: { title: string; description?: string }, error: string) {
  const { toast } = useToast();
  const refresh = useRefreshMembership();
  return useMutation({
    mutationFn: async () => (await apiRequest("POST", path)).json(),
    onSuccess: async () => {
      await refresh();
      toast(success);
    },
    onError: (err) => toast({ title: error, description: errorMessage(err), variant: "destructive" }),
  });
}

/** A renewing member: schedule the move to Free at the end of the paid period. */
export function DowngradeButton({ data }: { data: MembershipInfo }) {
  const downgrade = useMembershipAction(
    "/api/membership/downgrade",
    { title: "Moving to Free at renewal", description: "Your points and tiers are kept." },
    "Could not schedule the change",
  );
  const when = shortDate(data.expiry);
  return (
    <Button
      variant="outline"
      className="w-full h-11 bg-transparent border-[#0F3B47]/30"
      disabled={downgrade.isPending}
      onClick={() => {
        if (
          window.confirm(
            `You keep your card, points and tier benefits. From ${when} you will not be able to redeem resident offers. You can change your mind any time before then.`,
          )
        ) {
          downgrade.mutate();
        }
      }}
    >
      Move to Free at renewal
    </Button>
  );
}

/** A member with a downgrade scheduled: undo it. */
export function KeepMembershipButton() {
  const resume = useMembershipAction("/api/membership/resume", { title: "Membership kept", description: "Your membership will renew as normal." }, "Could not keep your membership");
  return (
    <Button variant="default" className="w-full h-12 text-base" disabled={resume.isPending} onClick={() => resume.mutate()}>
      Keep my membership
    </Button>
  );
}

/** Ends the membership today. Offered only after "Move to Free at renewal". */
export function CancelNowLink() {
  const cancel = useMembershipAction("/api/membership/cancel", { title: "Membership cancelled", description: "You can become a member again at any time." }, "Could not cancel");
  return (
    <button
      type="button"
      className="text-sm text-slate-brand underline underline-offset-[3px] self-center disabled:opacity-50"
      disabled={cancel.isPending}
      onClick={() => {
        if (window.confirm("This ends your membership today. No refund for the rest of the year. Your points and tiers are kept.")) cancel.mutate();
      }}
    >
      Cancel now
    </button>
  );
}

/** The sand note shown while a downgrade is scheduled. */
export function DowngradeScheduledNote({ data }: { data: MembershipInfo }) {
  return (
    <p className="text-sm">
      Moving to Free on <span className="font-bold">{formatDate(data.endsAt ?? data.expiry)}</span>. Your points and tiers are kept.
    </p>
  );
}
