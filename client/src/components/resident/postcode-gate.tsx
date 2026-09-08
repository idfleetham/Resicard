import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";

/** The shape of GET /api/postcode-check. It never says which districts are listed. */
export interface PostcodeCheck {
  valid: boolean;
  eligible: boolean;
  normalised: string | null;
  town: string;
}

/** A postcode is worth asking about once it could plausibly be one. */
function worthChecking(value: string): boolean {
  return value.replace(/\s+/g, "").length >= 5;
}

async function checkPostcode(postcode: string, signal: AbortSignal): Promise<PostcodeCheck> {
  const res = await fetch(`/api/postcode-check?postcode=${encodeURIComponent(postcode)}`, { signal });
  if (!res.ok) throw new Error("Could not check that postcode");
  return (await res.json()) as PostcodeCheck;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Called with the tidied postcode when it passes, and with null when it no longer does. */
  onResult: (result: PostcodeCheck | null) => void;
  result: PostcodeCheck | null;
  /** Where an out-of-area visitor's "tell me if this widens" email goes. */
  contactEmail: string;
}

/**
 * The postcode, asked first and on its own, answered as soon as it is typed.
 *
 * Checking runs on blur and on a short debounce, not on every keystroke: the
 * answer should feel immediate without a request per character. The server keeps
 * the real check at registration; this is a courtesy, not the control.
 */
export default function PostcodeGate({ value, onChange, onResult, result, contactEmail }: Props) {
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  const run = (raw: string) => {
    const postcode = raw.trim();
    if (!worthChecking(postcode)) {
      onResult(null);
      setChecking(false);
      return;
    }
    const attempt = ++latest.current;
    const controller = new AbortController();
    setChecking(true);
    setFailed(false);
    checkPostcode(postcode, controller.signal)
      .then((res) => {
        if (attempt !== latest.current) return;
        onResult(res);
        setChecking(false);
      })
      .catch(() => {
        if (attempt !== latest.current) return;
        onResult(null);
        setFailed(true);
        setChecking(false);
      });
  };

  // A short pause after typing stops, rather than a request per keystroke.
  useEffect(() => {
    if (!worthChecking(value)) {
      onResult(null);
      return;
    }
    const timer = setTimeout(() => run(value), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const subject = encodeURIComponent(`Resicard: let me know if ${value.trim().toUpperCase()} is added`);
  const town = result?.town ?? "the town";

  return (
    <div className="space-y-3">
      <label htmlFor="postcode-gate" className="text-sm font-bold text-sea block">
        Your postcode
      </label>
      <Input
        id="postcode-gate"
        autoComplete="postal-code"
        autoCapitalize="characters"
        inputMode="text"
        placeholder="e.g. KY16 9AJ"
        className="h-12 rounded-xl text-base uppercase placeholder:normal-case"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => run(value)}
        data-testid="input-postcode-gate"
      />
      {!result && !checking && (
        <p className="text-xs text-[#5C6F75]">We check this first, so you know where you stand before filling anything in.</p>
      )}

      {checking && <p className="text-sm text-[#5C6F75]" data-testid="text-postcode-checking">Checking</p>}

      {!checking && failed && (
        <p className="text-sm text-[#5C6F75]">We could not check that just now. Try again in a moment.</p>
      )}

      {!checking && result?.eligible && (
        <p className="flex items-center gap-2 text-sm font-bold text-[#1F8A5B]" data-testid="text-postcode-eligible">
          <Check className="h-5 w-5 flex-none" strokeWidth={2.5} />
          {result.normalised} is in the Resicard area
        </p>
      )}

      {!checking && result && !result.valid && (
        <p className="text-sm text-[#0F3B47]/70" data-testid="text-postcode-invalid">
          That does not look like a UK postcode yet. Keep typing, or check it against your post.
        </p>
      )}

      {!checking && result?.valid && !result.eligible && (
        <div className="bg-sand rounded-xl p-4 space-y-2 text-sea" data-testid="text-postcode-outside">
          <p className="text-sm font-bold">Resicard does not cover {result.normalised} yet</p>
          <p className="text-sm text-[#0F3B47]/70">
            The card runs across a defined area around {town}, so we can only sign up people who live in it. That area may
            widen later, and if it does we would like to tell you.
          </p>
          <a
            href={`mailto:${contactEmail}?subject=${subject}`}
            className="text-sm font-bold text-sea underline underline-offset-4 inline-block"
            data-testid="link-postcode-waiting-list"
          >
            Email us your address to hear if it widens
          </a>
          <p className="text-xs text-[#0F3B47]/70">This opens your email app. Nothing is stored here.</p>
        </div>
      )}
    </div>
  );
}
