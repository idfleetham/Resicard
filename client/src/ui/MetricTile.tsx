import React from "react";
import { Card } from "./Card";

export function MetricTile({ label, value, icon, subtitle }: { label: string; value: React.ReactNode; icon?: React.ReactNode; subtitle?: string }) {
  return (
    <Card variant="ghost" padded={true} className="h-full">
      <div className="flex items-center justify-between">
        <span className="text-soft">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl
                         bg-gradient-to-br from-brand1/70 to-brand2/70 text-white">
          {icon ?? "•"}
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold text-fg">{value}</div>
      {subtitle && <div className="text-xs text-soft mt-1">{subtitle}</div>}
    </Card>
  );
}