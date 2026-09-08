import { Link } from "wouter";
import { Check } from "lucide-react";

/** A small "See all pricing" style text link to the public pricing page. */
export function PricingLink({ children = "See all pricing", className = "" }: { children?: string; className?: string }) {
  return (
    <Link href="/pricing" className={`text-sm font-bold text-sea underline underline-offset-[3px] ${className}`}>
      {children}
    </Link>
  );
}

export function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-sea">
          <Check className="h-5 w-5 shrink-0 text-sea" strokeWidth={2} aria-hidden="true" />
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The compact Free-against-Member reminder used inside the app. It is a summary,
 * not a copy of the pricing page; the link goes to the full comparison.
 */
export default function MiniCompare({ free, member }: { free: string[]; member: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white/70 rounded-2xl p-4 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-brand">Free</span>
        <FeatureList items={free} />
      </div>
      <div className="bg-white rounded-2xl p-4 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-brand">Member</span>
        <FeatureList items={member} />
      </div>
    </div>
  );
}
