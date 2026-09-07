import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useHouseholdMutation, type MembershipInfo } from "./use-membership";

const MEMBER_LIMIT = 1; // second adult

/** The primary's view: household code, the other adult, and code rotation. */
export function HouseholdPrimaryPanel({ data }: { data: MembershipInfo }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const rotate = useHouseholdMutation(() => ({ method: "POST", url: "/api/household/code/rotate" }), {
    success: "New household code",
    error: "Could not make a new code",
  });
  const remove = useHouseholdMutation<number>((id) => ({ method: "DELETE", url: `/api/household/members/${id}` }), {
    success: "Removed from your household",
    error: "Could not remove",
  });

  const copy = async () => {
    if (!data.household.code) return;
    try {
      await navigator.clipboard.writeText(data.household.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", description: "Select the code and copy it by hand.", variant: "destructive" });
    }
  };

  const members = data.household.members;

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <p className="text-xs text-slate-brand">Household code</p>
        <div className="flex items-center justify-between gap-3 mt-1">
          <p className="font-display font-extrabold text-[36px] leading-none tracking-[0.08em] text-sea tabular-nums select-all">
            {data.household.code ?? "-"}
          </p>
          <Button variant="outline" className="h-11 px-4 bg-white shrink-0" onClick={copy} disabled={!data.household.code}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-slate-brand">
        Give this code to the other adult. They sign up with their own details, then enter it under Household on their Card tab.
      </p>

      <div>
        <p className="text-xs text-slate-brand">Second adult</p>
        {members.length === 0 ? (
          <p className="text-sm text-sea mt-1">Nobody has joined yet.</p>
        ) : (
          <ul className="mt-1 divide-y divide-[#E6E9E8]">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 h-12">
                <div className="min-w-0">
                  <p className="font-bold text-sea truncate">{[m.firstName, m.surname].filter(Boolean).join(" ") || "Member"}</p>
                  <p className={`text-xs ${m.isResidencyVerified ? "text-[#1F8A5B]" : "text-slate-brand"}`}>
                    {m.isResidencyVerified ? "Address verified" : "Not yet verified"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-brand" aria-label="Remove from household" onClick={() => remove.mutate(m.id)} disabled={remove.isPending}>
                  <X className="h-5 w-5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {members.length < MEMBER_LIMIT && (
        <Button variant="outline" className="h-11 w-full bg-white" onClick={() => rotate.mutate()} disabled={rotate.isPending}>
          New code
        </Button>
      )}
    </div>
  );
}

/** The second adult's view: who covers them, and a way out. */
export function HouseholdMemberPanel({ data }: { data: MembershipInfo }) {
  const leave = useHouseholdMutation(() => ({ method: "POST", url: "/api/household/leave" }), {
    success: "You have left the household",
    error: "Could not leave",
  });
  const first = data.household.primary?.firstName || "the primary member";
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">Covered by <span className="font-bold">{first}</span>'s household membership.</p>
      <Button
        variant="outline"
        className="w-full h-11 bg-transparent border-[#0F3B47]/30"
        disabled={leave.isPending}
        onClick={() => {
          if (window.confirm("Leave this household? You will need your own membership to keep redeeming.")) leave.mutate();
        }}
      >
        Leave household
      </Button>
    </div>
  );
}

/** For someone without a membership: enter a code from a household primary. */
export function HouseholdJoinPanel() {
  const [code, setCode] = useState("");
  const join = useHouseholdMutation<string>((c) => ({ method: "POST", url: "/api/household/join", body: { code: c } }), {
    success: "You have joined the household",
    error: "Could not join",
  });
  return (
    <form
      className="border-t border-[#0F3B47]/15 pt-4 flex flex-col gap-3"
      onSubmit={(e) => { e.preventDefault(); if (code.trim()) join.mutate(code.trim().toUpperCase()); }}
    >
      <div>
        <h3 className="font-bold text-sea">Join a household</h3>
        <p className="text-sm text-slate-brand mt-1">Got a code from someone with a household membership? Enter it here.</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Household code"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={8}
          className="h-11 rounded-xl bg-white uppercase tracking-[0.1em] font-bold"
        />
        <Button type="submit" variant="outline" className="h-11 px-5 bg-white shrink-0" disabled={join.isPending || !code.trim()}>
          Join
        </Button>
      </div>
    </form>
  );
}
