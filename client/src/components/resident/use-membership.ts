import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "./format";

export type MembershipPlan = "individual" | "household";

export interface HouseholdMember {
  id: number;
  firstName: string | null;
  surname: string | null;
  isResidencyVerified: boolean;
}

export interface MembershipInfo {
  plan: MembershipPlan;
  status: "inactive" | "active" | "cancelled";
  expiry: string | null;
  fees: { individual: number; household: number };
  currency: string;
  canRedeem: boolean;
  reasons: string[];
  household: {
    role: "primary" | "member" | null;
    code: string | null;
    members: HouseholdMember[];
    primary: { firstName: string | null; surname: string | null } | null;
  };
}

export const MEMBERSHIP_KEY = ["/api/membership"] as const;

export function useMembership(opts: { enabled?: boolean } = {}) {
  return useQuery<MembershipInfo>({ queryKey: [...MEMBERSHIP_KEY], enabled: opts.enabled ?? true });
}

/** Membership is live when active and not yet expired. */
export function isMembershipLive(data: Pick<MembershipInfo, "status" | "expiry">): boolean {
  const expiry = data.expiry ? new Date(data.expiry) : null;
  return data.status === "active" && expiry !== null && expiry.getTime() > Date.now();
}

/** Refresh /api/membership and the signed-in user (card status comes from both). */
export function useRefreshMembership() {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: [...MEMBERSHIP_KEY] });
    await refresh();
  };
}

/** A JSON POST/DELETE against a household endpoint that refreshes membership afterwards. */
export function useHouseholdMutation<TVars = void>(
  request: (vars: TVars) => { method: string; url: string; body?: unknown },
  opts: { success: string; error: string },
) {
  const { toast } = useToast();
  const refresh = useRefreshMembership();
  return useMutation({
    mutationFn: async (vars: TVars) => {
      const { method, url, body } = request(vars);
      return (await apiRequest(method, url, body)).json() as Promise<unknown>;
    },
    onSuccess: async () => {
      await refresh();
      toast({ title: opts.success });
    },
    onError: (err) => toast({ title: opts.error, description: errorMessage(err), variant: "destructive" }),
  });
}
