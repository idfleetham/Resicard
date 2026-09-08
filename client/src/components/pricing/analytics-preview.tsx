import { AnalyticsDashboard, EXAMPLE_ANALYTICS } from "@/components/merchant/analytics";

/** The real analytics screen, rendered from a fixed example dataset. */
export default function AnalyticsPreview() {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">What the analytics look like</h2>
        <p className="text-sm text-slate-brand mt-1">
          This is the same screen an outlet on Insight sees, filled in with example numbers.
        </p>
      </div>
      <div className="bg-foam rounded-2xl p-3 sm:p-5 border border-[#E6E9E8]">
        <AnalyticsDashboard data={EXAMPLE_ANALYTICS} example />
      </div>
    </section>
  );
}
