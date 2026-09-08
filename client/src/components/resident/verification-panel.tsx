import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate } from "./format";
import PostcardCodeBox from "./postcard-code-box";
import VerifyChoices from "./verify-choices";

/** What each route involves, from the server so no number or place is typed here. */
export interface VerificationOptions {
  postcardCodeDays: number;
  postcardMaxAttempts: number;
  inPersonDetails: string;
}

/** An outlet that verifies residents on the operator's behalf. */
export interface VerifyingOutlet {
  id: string;
  name: string;
  address: string | null;
}

export interface VerificationInfo {
  verified: boolean;
  verifiedAt: string | null;
  method: "postcard" | "outlet" | "in_person" | null;
  address: { addressLine1: string | null; addressLine2: string | null; town: string | null; postcode: string | null };
  postcard: {
    status: "requested" | "posted" | "used" | "expired" | "cancelled" | null;
    requestedAt: string | null;
    postedAt: string | null;
    expiresAt: string | null;
    attemptsLeft: number | null;
  } | null;
  /** The code to show at a verifying outlet; null once the address is verified. */
  code: string | null;
  outlets: VerifyingOutlet[];
  options: VerificationOptions;
  canRequestPostcard: boolean;
  reason?: string;
}

const KEY = ["/api/verification"];
const METHOD_LABEL: Record<string, string> = { postcard: "by postcard", outlet: "at an outlet", in_person: "in person" };

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
  // A card that is being prepared or is on its way both get the code box; a card
  // that expired or was cancelled goes back to offering another one.
  const open = card && (card.status === "requested" || card.status === "posted") ? card : null;
  const ended = card?.status === "expired" ? "Your last code expired." : card?.status === "cancelled" ? "Your last postcard was cancelled." : null;

  return (
    <section className="bg-white rounded-2xl p-5 text-sea flex flex-col gap-4">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Verify your address</h2>
      {ended && <p className="text-sm font-semibold">{ended} You can request another.</p>}
      <AddressBlock address={data.address} />
      <p className="text-sm text-[#0F3B47]/70">There are two ways to confirm you live here. Pick whichever suits you.</p>
      <VerifyChoices
        options={data.options}
        canRequestPostcard={data.canRequestPostcard}
        reason={data.reason}
        requesting={request.isPending}
        onRequestPostcard={() => request.mutate()}
        code={data.code}
        outlets={data.outlets}
        postcardBox={
          open ? (
            <PostcardCodeBox
              card={open}
              maxAttempts={data.options.postcardMaxAttempts}
              code={code}
              error={codeError}
              pending={confirm.isPending}
              onChange={(v) => { setCode(v); setCodeError(null); }}
              onConfirm={() => confirm.mutate()}
            />
          ) : undefined
        }
      />
    </section>
  );
}
