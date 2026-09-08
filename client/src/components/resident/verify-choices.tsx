import { Mail, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerificationOptions } from "./verification-panel";

interface Props {
  options: VerificationOptions;
  contactEmail: string;
  canRequestPostcard: boolean;
  reason?: string;
  requesting: boolean;
  onRequestPostcard: () => void;
}

function Heading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
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
 * In person is free, immediate and keeps nothing; the postcard costs postage and
 * takes days. Both facts are stated plainly rather than one being pushed: a
 * person who would rather not meet anyone should not be nudged into it, and a
 * person who would rather not wait should not have to guess there is another way.
 */
export default function VerifyChoices({
  options,
  contactEmail,
  canRequestPostcard,
  reason,
  requesting,
  onRequestPostcard,
}: Props) {
  const subject = encodeURIComponent("Resicard: verify my address in person");
  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-[#E6E9E8] p-4 space-y-2">
        <Heading icon={<Mail className="h-5 w-5 text-sea" strokeWidth={2} />}>A card in the post</Heading>
        <p className="text-sm text-[#0F3B47]/70">
          We post a card with a six-character code to your address. It usually arrives in two to four days, and you type the
          code in here. The code lasts {options.postcardCodeDays} days and allows {options.postcardMaxAttempts} tries.
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

      <div className="rounded-xl border border-[#E6E9E8] p-4 space-y-2">
        <Heading icon={<UserCheck className="h-5 w-5 text-sea" strokeWidth={2} />}>In person</Heading>
        <p className="text-sm text-[#0F3B47]/70">
          Meet a member of the Resicard team and show anything with your address on it: a bill, a letter, a tenancy
          agreement. Nothing is scanned, copied or kept. A person looks at it, hands it back, and marks your account
          verified there and then.
        </p>
        <p className="text-sm text-[#0F3B47]/70" data-testid="text-in-person-details">{options.inPersonDetails}</p>
        <p className="text-xs text-[#5C6F75]">Free, done on the spot, and stores nothing. You have to meet someone.</p>
        <Button asChild variant="outline" className="w-full h-12 text-base">
          <a href={`mailto:${contactEmail}?subject=${subject}`} data-testid="link-verify-in-person">
            Email us to arrange it
          </a>
        </Button>
        <p className="text-xs text-[#5C6F75]">This opens your email app.</p>
      </div>
    </div>
  );
}
