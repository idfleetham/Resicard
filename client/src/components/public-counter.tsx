import { useQuery } from "@tanstack/react-query";

/**
 * Two figures: residents with a card and outlets taking it. The server decides
 * whether they are worth showing at all — early numbers argue against joining —
 * so when `visible` is false this renders nothing rather than a smaller version
 * of itself. It is a quiet line, not a hero: no animation, no counting up.
 */

interface PublicStats {
  town: string;
  residents: number;
  merchants: number;
  visible: boolean;
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-display font-extrabold text-[34px] sm:text-[40px] leading-none tracking-[-0.02em] tabular-nums text-sea">
        {value.toLocaleString("en-GB")}
      </span>
      <span className="text-xs font-semibold text-[#5C6F75]">{label}</span>
    </div>
  );
}

export default function PublicCounter({ className = "" }: { className?: string }) {
  const { data } = useQuery<PublicStats>({ queryKey: ["/api/stats"], staleTime: 60 * 60 * 1000 });
  if (!data?.visible) return null;

  return (
    <div className={`flex items-start gap-10 ${className}`}>
      <Figure value={data.residents} label="residents" />
      <Figure value={data.merchants} label="outlets" />
    </div>
  );
}
