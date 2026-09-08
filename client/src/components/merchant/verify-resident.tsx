import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";
import CodeInput from "@/components/resident/code-input";
import { Panel, SectionTitle } from "./portal-ui";

/** Exactly what the endpoint returns: enough to check a letter, and nothing else. */
interface LetterCheck {
  firstName: string | null;
  surname: string | null;
  addressLine1: string | null;
  town: string | null;
  postcode: string | null;
}

function addressLines(r: LetterCheck): string[] {
  return [r.addressLine1, r.town, r.postcode].filter((l): l is string => Boolean(l && l.trim()));
}

function residentName(r: LetterCheck): string {
  return [r.firstName, r.surname].filter(Boolean).join(" ") || "This resident";
}

/**
 * Verifying a resident's address at the counter.
 *
 * One screen, the same shape as a redemption: a code goes in, a person and an
 * address come back, staff look at the letter in front of them and say yes. The
 * address is on screen because there is no way to check a letter against an
 * account without seeing what the account says; it is not stored, printed or
 * copied anywhere, and it appears only because the resident handed over a code.
 */
export default function VerifyResident() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<LetterCheck | null>(null);
  const [done, setDone] = useState<LetterCheck | null>(null);

  const reset = () => {
    setCode("");
    setError(null);
    setFound(null);
    setDone(null);
  };

  const lookup = useMutation({
    mutationFn: async () => (await apiRequest("GET", `/api/merchant/verify/${encodeURIComponent(code)}`)).json() as Promise<LetterCheck>,
    onSuccess: (res) => { setFound(res); setError(null); },
    onError: (err) => { setFound(null); setError(errorMessage(err)); },
  });

  const confirm = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/merchant/verify", { code, confirmed: true })).json(),
    onSuccess: () => { setDone(found); setFound(null); setCode(""); setError(null); },
    onError: (err) => { setError(errorMessage(err)); setFound(null); },
  });

  if (done) {
    return (
      <Panel>
        <div className="flex gap-3">
          <Check className="h-6 w-6 flex-none text-[#1F8A5B]" strokeWidth={2.5} />
          <div className="flex-1">
            <p className="font-display font-bold text-2xl tracking-[-0.02em] text-[#1F8A5B]">Verified</p>
            <p className="text-sm text-[#0F3B47]/70 mt-1">
              {residentName(done)} is now a verified resident. Hand the letter back; nothing has been kept.
            </p>
            <Button variant="outline" className="h-12 px-6 mt-4" onClick={reset} data-testid="button-verify-another">
              Verify someone else
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="max-w-xl">
      <div className="flex items-center gap-2 mb-2">
        <Store className="h-5 w-5 text-sea" strokeWidth={2} />
        <SectionTitle>Verify a resident</SectionTitle>
      </div>
      <p className="text-sm text-[#0F3B47]/70 mb-4">
        Type the code from their app, then check the address on screen against something they are showing you with their
        name and address on it. Nothing is scanned, copied or kept.
      </p>

      <CodeInput
        value={code}
        onChange={(v) => { setCode(v); setError(null); setFound(null); }}
        disabled={confirm.isPending}
        label="Verification code"
      />
      {error && <p className="text-sm font-semibold text-[#B5321A] mt-3" data-testid="text-verify-error">{error}</p>}

      {found ? (
        <div className="mt-4 space-y-4">
          <div className="bg-foam rounded-xl p-4" data-testid="panel-resident-details">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#5C6F75]">On the account</p>
            <p className="font-bold text-sea mt-1">{residentName(found)}</p>
            <div className="text-sm text-sea mt-1">
              {addressLines(found).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
          <p className="text-sm text-[#0F3B47]/70">Does the letter they are showing you match this name and address?</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="buoy"
              className="h-12 px-6 flex-1"
              disabled={confirm.isPending}
              onClick={() => confirm.mutate()}
              data-testid="button-confirm-verify"
            >
              {confirm.isPending ? "Saving" : "Yes, verify"}
            </Button>
            <Button variant="outline" className="h-12 px-6" onClick={reset} data-testid="button-cancel-verify">
              No, cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="w-full h-12 text-base mt-4"
          disabled={code.length !== 6 || lookup.isPending}
          onClick={() => lookup.mutate()}
          data-testid="button-lookup-code"
        >
          {lookup.isPending ? "Checking" : "Look up code"}
        </Button>
      )}
    </Panel>
  );
}
