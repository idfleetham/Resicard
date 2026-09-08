import type { ReactNode } from "react";
import { Mail, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerificationOptions, VerifyingOutlet } from "./verification-panel";

interface Props {
  options: VerificationOptions;
  canRequestPostcard: boolean;
  reason?: string;
  requesting: boolean;
  onRequestPostcard: () => void;
  /** The code box, once a card has been requested. Replaces the request button. */
  postcardBox?: ReactNode;
  /** The resident's own code, shown to staff at a verifying outlet. */
  code: string | null;
  outlets: VerifyingOutlet[];
}

function Heading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-display font-bold text-lg tracking-[-0.02em] text-sea">
      {icon}
      {children}
    </h3>
  );
}

/**
 * The two routes, side by side and level with each other.
 *
 * The outlet is free, done while you are standing there and keeps nothing; the
 * postcard costs postage and takes days. Both facts are stated plainly rather
 * than one being pushed: someone who would rather not hand a letter across a bar
 * should not be nudged into it, and someone who would rather not wait should not
 * have to guess there is another way.
 */
export default function VerifyChoices({
  options,
  canRequestPostcard,
  reason,
  requesting,
  onRequestPostcard,
  postcardBox,
  code,
  outlets,
}: Props) {
  return (
    <div className="grid gap-3">
      {postcardBox ?? (
        <div className="rounded-xl border border-[#E6E9E8] p-4 space-y-2">
          <Heading icon={<Mail className="h-5 w-5 text-sea" strokeWidth={2} />}>A card in the post</Heading>
          <p className="text-sm text-[#0F3B47]/70">
            We post a card with a six-character code to your address. It usually arrives in two to four days, and you type
            the code in here. The code lasts {options.postcardCodeDays} days and allows {options.postcardMaxAttempts} tries.
          </p>
          <p className="text-xs text-[#5C6F75]">Takes a few days. Costs us the postage. We keep a record of the card.</p>
          {!canRequestPostcard && reason && <p className="text-sm text-[#0F3B47]/70">{reason}</p>}
          {/* Both routes get the same weight of button: neither is the recommended one. */}
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            disabled={!canRequestPostcard || requesting}
            onClick={onRequestPostcard}
            data-testid="button-request-postcard"
          >
            {requesting ? "Requesting" : "Post me a code"}
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-[#E6E9E8] p-4 space-y-3">
        <Heading icon={<Store className="h-5 w-5 text-sea" strokeWidth={2} />}>At an outlet</Heading>
        <p className="text-sm text-[#0F3B47]/70">
          Take this code, with something showing your name and address, to any of the outlets below. Staff check the
          address against your account and verify you there and then. Nothing is scanned, copied or kept.
        </p>
        {code && (
          <div className="bg-sand rounded-xl p-4 text-center" data-testid="text-verification-code">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#5C6F75]">Your verification code</p>
            <p className="font-display font-extrabold text-[32px] leading-none tracking-[0.16em] text-sea mt-2">{code}</p>
          </div>
        )}
        <p className="text-xs text-[#5C6F75]">Free, done on the spot, and stores nothing. The code works until it is used.</p>
        {outlets.length === 0 ? (
          <p className="text-sm text-[#0F3B47]/70">No outlets are verifying just now. The postcard is the way in the meantime.</p>
        ) : (
          <ul className="divide-y divide-[#E6E9E8]" data-testid="list-verifying-outlets">
            {outlets.map((o) => (
              <li key={o.id} className="py-2.5">
                <p className="text-sm font-bold text-sea">{o.name}</p>
                {o.address && <p className="text-xs text-[#5C6F75]">{o.address}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
