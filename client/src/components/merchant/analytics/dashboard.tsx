import HeadlineTiles from "./headline-tiles";
import WeeklyChart from "./weekly-chart";
import TimingCharts from "./timing-charts";
import OfferPerformance from "./offer-performance";
import LoyaltyBlock from "./loyalty-block";
import TownBlock from "./town-block";
import PeriodPicker, { type PeriodChoice } from "./period-picker";
import type { AnalyticsData } from "./types";

/**
 * The whole analytics screen, from one payload. The same component renders a real
 * merchant's numbers and the example dataset, so the preview on the pricing page
 * and on the Free plan cannot drift away from the product.
 */
export default function AnalyticsDashboard({
  data,
  example = false,
  choice,
  onChoiceChange,
}: {
  data: AnalyticsData;
  example?: boolean;
  /** Omitted for the example dataset, which has nothing to re-query. */
  choice?: PeriodChoice;
  onChoiceChange?: (next: PeriodChoice) => void;
}) {
  const from = new Date(data.range.from).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const to = new Date(data.range.to).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const note = `${from} to ${to}, against ${data.range.compareLabel}.`;

  return (
    <div className="space-y-3">
      {example && (
        <div className="bg-sand rounded-2xl p-5 text-sm text-sea">
          <span className="font-bold">Example data.</span> This is what your own numbers will look like.
        </div>
      )}

      {choice && onChoiceChange ? (
        <PeriodPicker value={choice} onChange={onChoiceChange} note={note} />
      ) : (
        <div className="bg-white rounded-2xl border border-hairline px-5 py-4">
          <p className="text-xs text-slate-brand">{note}</p>
        </div>
      )}

      <HeadlineTiles headline={data.headline} range={data.range} />
      <WeeklyChart byWeek={data.byWeek} />
      <TimingCharts byDay={data.byDay} byHour={data.byHour} range={data.range} />
      <OfferPerformance byOffer={data.byOffer} range={data.range} />

      {data.loyalty ? (
        <LoyaltyBlock loyalty={data.loyalty} />
      ) : (
        <div className="bg-sand rounded-2xl p-5 text-sm text-sea">
          You have not set up a loyalty programme, so there is nothing to show here yet.
        </div>
      )}

      {data.town && <TownBlock town={data.town} />}
    </div>
  );
}

export type { AnalyticsData } from "./types";
