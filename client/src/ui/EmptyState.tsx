import React from "react";
import { Card } from "./Card";

export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <Card variant="surface" className="flex min-h-[220px] items-center justify-center text-center">
      <div>
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl
                        bg-white/[0.06] ring-1 ring-dim text-fg">
          {icon ?? "□"}
        </div>
        <div className="text-fg text-lg font-medium">{title}</div>
        {subtitle && <div className="text-soft mt-1">{subtitle}</div>}
      </div>
    </Card>
  );
}