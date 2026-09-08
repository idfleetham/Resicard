import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Check, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate } from "./format";
import CodeInput from "./code-input";

export interface VerificationInfo {
  verified: boolean;
  verifiedAt: string | null;
  method: "postcard" | "in_person" | null;
  address: { addressLine1: string | null; addressLine2: string | null; town: string | null; postcode: string | null };
  postcard: {
    status: "requested" | "posted" | "used" | "expired" | "cancelled" | null;
    requestedAt: string | null;
    postedAt: string | null;
    expiresAt: string | null;
    attemptsLeft: number | null;
  } | null;
  canRequestPostcard: boolean;
  reason?: string;
}

const KEY = ["/api/verification"];
const METHOD_LABEL: Record<string, string> = { postcard: "by postcard", in_person: "in person" };

function AddressBlock({ address }: { address: VerificationInfo["address"] }) {
  const lines = [address.addressLine1, address.addressLine2, address.town, address.postcode].filter(Boolean);
  return (
    <div className="bg-foam rounded-xl p-4 flex items-start justify-between gap-3">
      <div className="text-sm leading-relaxed">
        {lines.length ? lines.map((l, i) => <div key={i}>{l}</div>) : <span className="text-slate-brand">No address on file yet.</span>}
      </div>
      <Link href="/edit-profile" className="text-sm font-bold text-sea underline underline-offset-4 shrink-0">Edit</Link>
    </div>
  );
}

const IN_PERSON = "Or get verified in person at a Resicard event. Bring anything with your address on it.";

export default function VerificationPanel() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<VerificationInfo>({ queryKey: KEY, enabled: Boolean(user) });
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: KEY });
    await refresh();
  };

  const request = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/verification/postcard")).json() as Promise<VerificationInfo>,
    onSuccess: async (res) => { queryClient.setQueryData(KEY, res); toast({ title: "Postcard requested", description: "We will post a card with your code." }); },
    onError: (err) => toast({ title: "Could not request a postcard", description: errorMessage(err), variant: "destructive" }),
  });

  const confirm = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/verification/postcard/code", { code })).json() as Promise<VerificationInfo>,
    onSuccess: async () => { setCode(""); setCodeError(null); await reload(); toast({ title: "Address verified" }); },
    onError: async (err) => { setCodeError(errorMessage(err)); setCode(""); await queryClient.invalidateQueries({ queryKey: KEY }); },
  });

  if (!user) return null;
  if (isLoading || !data) return <div className="bg-white rounded-2xl h-28 animate-pulse" />;

  if (data.verified) {
    return (
      <div className="bg-white rounded-2xl p-5 flex gap-3">
        <Check className="h-5 w-5 flex-none text-[#1F8A5B]" strokeWidth={2.5} />
        <div>
          <p className="font-bold text-[#1F8A5B]">Address verified</p>
          <p className="text-sm text-slate-brand mt-1">
            {data.verifiedAt
              ? `Confirmed ${METHOD_LABEL[data.method ?? ""] ?? ""} on ${formatDate(data.verifiedAt)}.`.replace("  ", " ")
              : "Your St Andrews address is confirmed."}
          </p>
        </div>
      </div>
    );
  }

  const card = data.postcard;

  if (card?.status === "requested") {
    return (
      <div className="bg-sand rounded-2xl p-5 flex gap-3 text-sea">
        <Clock className="h-5 w-5 flex-none" />
        <div>
          <p className="font-bold">Your card is being prepared</p>
          <p className="text-sm mt-1">Requested {formatDate(card.requestedAt)}. It will be posted to your address and usually arrives in 2 to 4 days.</p>
          <p className="text-xs text-slate-brand mt-2">{IN_PERSON}</p>
        </div>
      </div>
    );
  }

  if (card?.status === "posted") {
    return (
      <section className="bg-white rounded-2xl p-5 text-sea flex flex-col gap-4">
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Enter your code</h2>
        <p className="text-sm text-slate-brand">
          <Mail className="inline h-4 w-4 mr-1 -mt-0.5" />
          Posted {formatDate(card.postedAt)}. Type the 6-character code from the card. It expires on {formatDate(card.expiresAt)}.
        </p>
        <CodeInput value={code} onChange={(v) => { setCode(v); setCodeError(null); }} disabled={confirm.isPending} />
        {codeError && <p className="text-sm font-semibold text-[#B5321A]">{codeError}</p>}
        {!codeError && card.attemptsLeft !== null && card.attemptsLeft < 5 && (
          <p className="text-xs text-slate-brand">{card.attemptsLeft} attempt{card.attemptsLeft === 1 ? "" : "s"} left.</p>
        )}
        <Button className="w-full h-12 text-base" disabled={code.length !== 6 || confirm.isPending} onClick={() => confirm.mutate()}>
          {confirm.isPending ? "Checking" : "Confirm"}
        </Button>
        <p className="text-xs text-slate-brand">{IN_PERSON}</p>
      </section>
    );
  }

  const ended = card?.status === "expired" ? "Your last code expired." : card?.status === "cancelled" ? "Your last postcard was cancelled." : null;

  return (
    <section className="bg-white rounded-2xl p-5 text-sea flex flex-col gap-4">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Verify your address</h2>
      {ended && <p className="text-sm font-semibold">{ended} You can request another.</p>}
      <AddressBlock address={data.address} />
      <p className="text-sm text-slate-brand">We post a card with a code to your address. Enter the code when it arrives. Usually 2 to 4 days.</p>
      {!data.canRequestPostcard && data.reason && <p className="text-sm text-slate-brand">{data.reason}</p>}
      <Button className="w-full h-12 text-base" disabled={!data.canRequestPostcard || request.isPending} onClick={() => request.mutate()}>
        {request.isPending ? "Requesting" : "Post me a code"}
      </Button>
      <p className="text-xs text-slate-brand">{IN_PERSON}</p>
    </section>
  );
}
