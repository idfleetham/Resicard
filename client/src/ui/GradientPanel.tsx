export function GradientPanel({ children }: {children: React.ReactNode}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
      {children}
    </div>
  );
}