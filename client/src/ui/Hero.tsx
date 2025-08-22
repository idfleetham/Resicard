import { motion } from "framer-motion";

export default function Hero({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 grad-primary p-6 text-white shadow-[0_14px_40px_rgba(0,0,0,.35)]"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="text-white/80">{subtitle}</p>}
        </div>
        {right}
      </div>
    </motion.div>
  );
}