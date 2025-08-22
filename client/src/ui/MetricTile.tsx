import { motion } from "framer-motion";

export default function MetricTile({ label, value, delta, icon }: { label: string; value: React.ReactNode; delta?: string; icon?: React.ReactNode }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="card card-hover p-5">
      <div className="flex items-center justify-between">
        <span className="text-muted">{label}</span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/7 ring-1 ring-white/10">{icon ?? "•"}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      {delta && <div className="mt-2 text-xs text-emerald-300">+{delta}</div>}
    </motion.div>
  );
}

export { MetricTile };