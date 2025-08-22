export function StatCard({ title, subtitle, children }: {title: string; subtitle?: string; children?: React.ReactNode}) {
  return (
    <div className="card card-hover">
      <div className="border-b border-white/10 px-6 py-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-muted">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}