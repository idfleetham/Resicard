import type { ReactNode } from "react";
import Navigation from "@/components/navigation";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

/** Centred white card on the slate background, used by the sign-in and account pages. */
export default function AuthLayout({ title, subtitle, children, wide = false }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className={`mx-auto px-4 py-6 sm:py-10 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-slate-600 mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
