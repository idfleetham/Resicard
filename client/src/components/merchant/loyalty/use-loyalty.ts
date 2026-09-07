import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/components/resident/format";
import { PROGRAM_KEY, type LoyaltyProgramData } from "./types";

export function useLoyaltyProgram() {
  return useQuery<LoyaltyProgramData | null>({ queryKey: [...PROGRAM_KEY] });
}

/** Generic JSON mutation against a loyalty endpoint that refreshes the programme afterwards. */
export function useLoyaltyMutation<TVars>(
  request: (vars: TVars) => { method: string; url: string; body?: unknown },
  opts: { success: string; error: string; also?: string[] },
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: TVars) => {
      const { method, url, body } = request(vars);
      return (await apiRequest(method, url, body)).json() as Promise<unknown>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...PROGRAM_KEY] });
      for (const key of opts.also ?? []) await queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: opts.success });
    },
    onError: (err) => toast({ title: opts.error, description: errorMessage(err), variant: "destructive" }),
  });
}
