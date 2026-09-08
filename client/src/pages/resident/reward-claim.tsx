import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRequireRole } from "@/hooks/use-auth";
import { errorMessage } from "@/components/resident/format";
import { GreenScreen, GreenScreenLoading, GreenScreenNotFound, type GreenScreenLoyalty } from "@/components/resident/green-screen";

/** Response of POST /api/loyalty/redeem-reward and GET /api/reward-claims/:id. */
export interface RewardClaimDetails {
  claim: { id: string; code: string; claimedAt: string; pointsSpent: number };
  reward: { id: string; name: string; terms: string | null };
  merchant: { id: string; name: string; logoUrl: string | null };
  resident: { firstName: string | null; surname: string | null; profilePhoto: string | null };
  loyalty: GreenScreenLoyalty;
}

/** "Paid with 100 points", or "Free reward" for a tier benefit. */
function paidWith(claim: RewardClaimDetails["claim"]): string {
  return claim.pointsSpent > 0 ? `Paid with ${claim.pointsSpent} points` : "Free reward";
}

/** The reward name over at most two lines; longer names split at the middle word. */
function nameLines(name: string): string[] {
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || name.length <= 16) return [name.trim()];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export default function RewardClaimPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { ready } = useRequireRole("resident");

  const { data, isLoading, error } = useQuery<RewardClaimDetails>({
    queryKey: [`/api/reward-claims/${id}`],
    enabled: ready && id.length > 0,
  });

  if (!ready || isLoading) return <GreenScreenLoading />;
  if (error || !data) return <GreenScreenNotFound title="Reward claim not found" message={error ? errorMessage(error) : ""} />;

  return (
    <GreenScreen
      kind="reward"
      headlineLines={nameLines(data.reward.name)}
      title={paidWith(data.claim)}
      terms={data.reward.terms}
      merchant={data.merchant}
      resident={data.resident}
      code={data.claim.code}
      at={data.claim.claimedAt}
      loyalty={data.loyalty}
    />
  );
}
