import { useRef } from "react";

const LENGTH = 6;

/**
 * Six upper-case boxes for the postcard code. One hidden-looking input per box so
 * phone keyboards and paste both work; typing moves forward, backspace moves back.
 */
export default function CodeInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LENGTH);

  const setAt = (i: number, ch: string) => {
    const next = chars.padEnd(LENGTH, " ").split("");
    next[i] = ch;
    onChange(next.join("").replace(/\s+$/, "").replace(/ /g, ""));
  };

  const onInput = (i: number, raw: string) => {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean) {
      setAt(i, " ");
      return;
    }
    if (clean.length > 1) {
      // Paste: fill from this box onwards.
      onChange((chars.slice(0, i) + clean).slice(0, LENGTH));
      refs.current[Math.min(LENGTH - 1, i + clean.length)]?.focus();
      return;
    }
    setAt(i, clean);
    refs.current[Math.min(LENGTH - 1, i + 1)]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      refs.current[i - 1]?.focus();
      setAt(i - 1, " ");
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < LENGTH - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex gap-2" aria-label="Postcard code">
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={chars[i] ?? ""}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          maxLength={LENGTH}
          aria-label={`Character ${i + 1}`}
          className="h-12 w-full min-w-0 rounded-xl border border-[#E6E9E8] bg-white text-center font-mono text-xl font-bold uppercase text-sea focus:border-sea focus:outline-none disabled:opacity-50"
        />
      ))}
    </div>
  );
}
