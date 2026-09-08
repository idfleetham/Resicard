import { SectionTitle } from "../portal-ui";
import { NOT_SHOWN, NOT_SHOWN_LABEL, SEX_LABELS, percent, type DemographicsData } from "./types";

/**
 * Who is redeeming, in aggregate only. Every figure is a share of the residents
 * who chose to answer, and any group too small to stay anonymous arrives from the
 * server already folded into "not shown" — so this component never has a number
 * it could name a person with. The note says so, because a merchant reading it
 * should know what they are and are not being given.
 */

function Rows({ rows, label }: { rows: { key: string; label: string; share: number }[]; label: string }) {
  const top = rows.reduce((max, r) => Math.max(max, r.share), 0);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-brand mb-2">{label}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-brand">Nobody in this window answered this one.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-3">
              <span className="text-sm text-sea w-24 shrink-0">{row.label}</span>
              <span className="h-2 rounded-full bg-foam flex-1 overflow-hidden">
                <span
                  className={`block h-full rounded-full ${row.key === NOT_SHOWN ? "bg-sand" : "bg-sea"}`}
                  style={{ width: `${top === 0 ? 0 : Math.max(2, (row.share / top) * 100)}%` }}
                />
              </span>
              <span className="text-sm text-slate-brand w-10 text-right shrink-0">{percent(row.share)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function DemographicsBlock({ demographics }: { demographics: DemographicsData }) {
  const ageRows = demographics.ageBands.map((b) => ({
    key: b.band,
    label: b.band === NOT_SHOWN ? NOT_SHOWN_LABEL : b.band,
    share: b.share,
  }));
  const sexRows = demographics.sex.map((s) => ({
    key: s.value,
    label: s.value === NOT_SHOWN ? NOT_SHOWN_LABEL : SEX_LABELS[s.value] ?? s.value,
    share: s.share,
  }));

  return (
    <div className="bg-white rounded-2xl p-5">
      <SectionTitle>Who is redeeming</SectionTitle>
      <p className="text-xs text-slate-brand mt-1 mb-4">
        Residents who redeemed in these 90 days, counted once each. Both questions are optional, so these are shares of
        the people who answered. Any group too small to stay anonymous is shown as not shown.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Rows rows={ageRows} label="Age" />
        <Rows rows={sexRows} label="Sex" />
      </div>
    </div>
  );
}
