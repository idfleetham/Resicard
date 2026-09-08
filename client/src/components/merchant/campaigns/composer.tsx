import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";
import { EmptyNote, Panel, SectionTitle } from "../portal-ui";
import { AUDIENCE_LABELS, londonMoment, type CampaignAudience, type CampaignsResponse } from "./types";

/**
 * The composer. Every limit shown here is also applied on the server; this is
 * the merchant seeing the rule, not a control over it. There is no free-text
 * send: the message is one line attached to an offer that is live right now.
 */

interface Props {
  data: CampaignsResponse;
}

interface SendResult {
  queued: boolean;
  scheduledFor?: string;
  size: number | null;
  suppressed: boolean;
  minimum: number;
}

/** The count, or a line saying why there is no count, so the number is never guessable. */
function audienceLine(data: CampaignsResponse, audience: CampaignAudience): string {
  const found = data.audiences.find((a) => a.audience === audience);
  if (!found) return "";
  if (found.suppressed) return `Fewer than ${found.minimum} members, so the number is not shown`;
  return `${found.size} member${found.size === 1 ? "" : "s"}`;
}

export default function CampaignComposer({ data }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [offerId, setOfferId] = useState<string>(data.eligibleOffers[0]?.id ?? "");
  const [audience, setAudience] = useState<CampaignAudience>("all");
  const [body, setBody] = useState("");

  const remaining = data.limits.bodyMax - body.length;
  const overLength = remaining < 0;

  const send = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/merchant/campaigns", { offerId, body: body.trim(), audience });
      return (await response.json()) as SendResult;
    },
    onSuccess: (result) => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["/api/merchant/campaigns"] });
      toast({
        title: result.queued ? "Queued" : "Sent",
        description: result.queued
          ? `Nothing goes out between ${data.limits.windowEndHour}:00 and ${String(data.limits.windowStartHour).padStart(2, "0")}:00. This goes out on ${londonMoment(result.scheduledFor ?? data.nextAllowedAt)}.`
          : result.suppressed
            ? "It is on its way to your members."
            : `It is on its way to ${result.size} member${result.size === 1 ? "" : "s"}.`,
      });
    },
    onError: (error) => {
      toast({ title: "Not sent", description: errorMessage(error), variant: "destructive" });
    },
  });

  if (data.eligibleOffers.length === 0) {
    return (
      <Panel className="space-y-3">
        <SectionTitle>Send an offer to residents</SectionTitle>
        <EmptyNote>
          You can only send an offer that residents could redeem right now. Make one live on the Offers tab and it will
          appear here.
        </EmptyNote>
      </Panel>
    );
  }

  const blocked = !data.canSendNow;

  return (
    <Panel className="space-y-5">
      <div className="space-y-2">
        <SectionTitle>Send an offer to residents</SectionTitle>
        <p className="text-sm text-[#5C6F75]">
          One a week, at most {data.limits.monthlyCap} a month, and only between{" "}
          {String(data.limits.windowStartHour).padStart(2, "0")}:00 and {data.limits.windowEndHour}:00. Those limits are
          what keeps residents letting anyone through at all.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-offer">Offer</Label>
        <select
          id="campaign-offer"
          value={offerId}
          onChange={(e) => setOfferId(e.target.value)}
          className="h-12 w-full rounded-xl border border-[#E6E9E8] bg-white px-3 text-sm text-sea"
        >
          {data.eligibleOffers.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offer.title}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#0F3B47]/70">Only offers that are live right now can be sent.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-body">Your line</Label>
        <Textarea
          id="campaign-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={data.limits.bodyMax + 40}
          placeholder="Quiet Tuesday, so the set menu is on until nine."
          className="rounded-xl text-base"
        />
        <p className={`text-xs ${overLength ? "text-[#B5321A]" : "text-slate-brand"}`}>
          {remaining} character{remaining === 1 || remaining === -1 ? "" : "s"} left of {data.limits.bodyMax}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-sea mb-1">Who sees it</legend>
        {(Object.keys(AUDIENCE_LABELS) as CampaignAudience[]).map((key) => (
          <label
            key={key}
            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${audience === key ? "border-sea" : "border-[#E6E9E8]"}`}
          >
            <input
              type="radio"
              name="campaign-audience"
              value={key}
              checked={audience === key}
              onChange={() => setAudience(key)}
              className="mt-1 accent-[#0F3B47]"
            />
            <span>
              <span className="block text-sm font-semibold text-sea">{AUDIENCE_LABELS[key]}</span>
              <span className="block text-xs text-[#0F3B47]/70">{audienceLine(data, key)}</span>
            </span>
          </label>
        ))}
        <p className="text-xs text-[#0F3B47]/70">
          You never see who is on the list, only how many. That is the deal residents signed up to.
        </p>
      </fieldset>

      {blocked ? (
        <div className="rounded-xl bg-sand p-4 text-sm text-sea">
          {data.blockedReason === "monthly_cap"
            ? `That is ${data.limits.monthlyCap} campaigns this month, which is the limit.`
            : `One campaign every ${data.limits.gapDays} days.`}{" "}
          You can send again on {londonMoment(data.nextAllowedAt)}.
        </div>
      ) : (
        <p className="text-sm text-[#0F3B47]/70">
          {new Date(data.nextAllowedAt).getTime() > Date.now()
            ? `Outside sending hours, so this will go out on ${londonMoment(data.nextAllowedAt)}.`
            : "This goes out straight away."}{" "}
          {data.sentThisMonth} of {data.limits.monthlyCap} used this month.
        </p>
      )}

      <Button
        variant="buoy"
        className="h-12 px-6"
        disabled={blocked || send.isPending || body.trim().length === 0 || overLength || !offerId}
        onClick={() => send.mutate()}
      >
        {send.isPending ? "Sending" : "Send"}
      </Button>
    </Panel>
  );
}
