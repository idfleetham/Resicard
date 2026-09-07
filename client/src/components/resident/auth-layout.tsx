import type { ReactNode } from "react";
import Navigation from "@/components/navigation";
import { Logo } from "@/components/brand/logo";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

/** Centred white card on foam with the Logo above, used by the sign-in and account pages. */
export default function AuthLayout({ title, subtitle, children, wide = false }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <main className={`mx-auto px-5 py-8 sm:py-12 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="flex justify-center mb-6">
          <Logo size={32} />
        </div>
        <div className="bg-white rounded-2xl p-5 sm:p-8">
          <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-none tracking-[-0.03em]">{title}</h1>
          {subtitle && <p className="text-sm text-slate-brand mt-2">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
