import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import CodeInput from "./code-input";
import { formatDate } from "./format";
import type { VerificationInfo } from "./verification-panel";

interface Props {
  card: NonNullable<VerificationInfo["postcard"]>;
  maxAttempts: number;
  code: string;
  error: string | null;
  pending: boolean;
  onChange: (value: string) => void;
  onConfirm: () => void;
}

/**
 * The box for the code printed on the postcard.
 *
 * It appears as soon as a card has been requested rather than once one has been
 * posted. Waiting meant the route could not be finished by anyone whose card
 * turned up early, and left the panel with nothing to do for days. A code typed
 * before the card exists fails the same way a wrong code does, which costs
 * nothing and says the honest thing.
 */
export default function PostcardCodeBox({ card, maxAttempts, code, error, pending, onChange, onConfirm }: Props) {
  const posted = card.status === "posted";
  return (
    <div className="rounded-xl border border-[#E6E9E8] p-4 space-y-3">
      <h3 className="flex items-center gap-2 font-display font-bold text-lg tracking-[-0.02em] text-sea">
        <Mail className="h-5 w-5 text-sea" strokeWidth={2} />
        Enter your code
      </h3>
      <p className="text-sm text-[#0F3B47]/70">
        {posted
          ? `Posted ${formatDate(card.postedAt)}. Type the 6-character code from the card. It expires on ${formatDate(card.expiresAt)}.`
          : `Requested ${formatDate(card.requestedAt)}. Your card is being prepared and usually arrives in two to four days. Type the 6-character code in here as soon as it lands.`}
      </p>
      <CodeInput value={code} onChange={onChange} disabled={pending} label="Postcard code" />
      {error && <p className="text-sm font-semibold text-[#B5321A]">{error}</p>}
      {!error && posted && card.attemptsLeft !== null && card.attemptsLeft < maxAttempts && (
        <p className="text-xs text-[#5C6F75]">
          {card.attemptsLeft} attempt{card.attemptsLeft === 1 ? "" : "s"} left.
        </p>
      )}
      <Button
        variant="outline"
        className="w-full h-12 text-base"
        disabled={code.length !== 6 || pending}
        onClick={onConfirm}
        data-testid="button-confirm-postcard-code"
      >
        {pending ? "Checking" : "Confirm"}
      </Button>
    </div>
  );
}
