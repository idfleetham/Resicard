import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ReferralInfo {
  code: string;
  shareLink: string;
  pending: number;
  credited: number;
  monthsPerReferral: number;
  monthsEarned: number;
  monthsLeft: number;
  capMonths: number;
}

const SHARE_TEXT = "Resicard gets St Andrews residents a local price at bars, cafes and shops in the town. Use my code when you join.";

/** "One friend joined" reads better than a bare number for the small counts this will show. */
function progressLine(data: ReferralInfo): string {
  if (data.credited === 0 && data.pending === 0) return "Nobody has used your code yet.";
  const parts: string[] = [];
  if (data.credited > 0) parts.push(`${data.credited} joined and paid`);
  if (data.pending > 0) parts.push(`${data.pending} signed up and not yet paid`);
  return `${parts.join(", ")}. ${data.monthsEarned} of ${data.capMonths} months earned this year.`;
}

/**
 * A quiet panel, not a hero: the card tab already has one orange action on it.
 * Sharing uses the phone's own share sheet where there is one, and falls back to
 * copying, because a code no one can pass on is worth nothing.
 */
export default function ReferralPanel() {
  const { data } = useQuery<ReferralInfo>({ queryKey: ["/api/referrals/mine"] });
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${data.code} — ${data.shareLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", description: "Select the code and copy it by hand.", variant: "destructive" });
    }
  };

  const share = async () => {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: "Resicard", text: `${SHARE_TEXT} ${data.code}`, url: data.shareLink });
    } catch {
      // A cancelled share sheet is not a failure, so nothing is said about it.
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col gap-3">
      <div>
        <h3 className="font-bold text-sea">Bring a neighbour</h3>
        <p className="text-sm text-[#0F3B47]/70 mt-1">
          When someone joins with your code and pays their first membership, you both get{" "}
          {data.monthsPerReferral === 1 ? "a month" : `${data.monthsPerReferral} months`} added. Up to {data.capMonths} months a year.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display font-extrabold text-[28px] leading-none tracking-[0.08em] text-sea tabular-nums select-all">
          {data.code}
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="h-11 px-4 bg-white" onClick={copy} aria-label="Copy your referral code">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" className="h-11 px-4 bg-white" onClick={share}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-brand">{progressLine(data)}</p>
    </div>
  );
}
