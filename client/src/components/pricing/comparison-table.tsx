import { Check, Minus } from "lucide-react";

/**
 * A plan comparison table with as many columns as it is given: two for residents,
 * three for businesses. A value may be a tick, a dash, or a short phrase where the
 * plans differ by a figure rather than by yes and no.
 */

export interface ComparisonRow {
  feature: string;
  /** One entry per column, in the same order as `columns`. */
  values: (boolean | string)[];
}

export interface ComparisonColumn {
  plan: string;
  price: string;
  note: string;
  /** Small print under this column, e.g. the household price. */
  footnote?: string;
}

export interface ComparisonTableProps {
  title: string;
  intro: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

function Cell({ value, plan }: { value: boolean | string; plan: string }) {
  if (typeof value === "string") {
    return <span className="text-[15px] leading-snug">{value}</span>;
  }
  return (
    <>
      {value ? (
        <Check className="h-5 w-5 text-sea mx-auto" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Minus className="h-5 w-5 text-slate-brand mx-auto" strokeWidth={2} aria-hidden="true" />
      )}
      <span className="sr-only">{value ? `Included in ${plan}` : `Not included in ${plan}`}</span>
    </>
  );
}

function PriceHead({ column, width }: { column: ComparisonColumn; width: string }) {
  return (
    <th scope="col" className={`${width} px-2 py-4 text-center align-bottom`}>
      <span className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-brand">{column.plan}</span>
      <span className="block font-display font-extrabold text-[22px] sm:text-[28px] leading-none tracking-[-0.02em] text-sea mt-1">
        {column.price}
      </span>
      <span className="block text-xs text-slate-brand mt-1 font-normal">{column.note}</span>
    </th>
  );
}

/**
 * On a phone the table is the wrong shape: three plans plus a feature column
 * either scroll sideways, which hides which column a tick belongs to, or squeeze
 * the price note into a column two words wide. So below sm each plan becomes a
 * card, and the paid ones list only what they add, which is how a person reads a
 * price list anyway.
 */
function PlanCards({ columns, rows }: { columns: ComparisonColumn[]; rows: ComparisonRow[] }) {
  return (
    <div className="sm:hidden flex flex-col gap-3">
      {columns.map((column, i) => {
        const previous = i > 0 ? columns[i - 1] : null;
        const included = rows.filter((r) => r.values[i] === true);
        const inherited = previous ? rows.filter((r) => r.values[i - 1] === true) : [];
        const added = included.filter((r) => !inherited.includes(r));
        const figures = rows.filter((r) => typeof r.values[i] === "string");
        const listed = previous ? added : included;

        return (
          <div key={column.plan} className="bg-white rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-brand">{column.plan}</p>
            <p className="font-display font-extrabold text-[32px] leading-none tracking-[-0.02em] text-sea mt-1">
              {column.price}
            </p>
            <p className="text-sm text-slate-brand mt-1">{column.note}</p>

            {previous && (
              <p className="text-[15px] text-sea mt-4 font-bold">Everything in {previous.plan}, plus</p>
            )}

            <ul className="mt-3 flex flex-col gap-2">
              {figures.map((row) => (
                <li key={row.feature} className="flex gap-2.5 text-[15px] leading-snug text-sea">
                  <span className="font-bold shrink-0 tabular-nums">{String(row.values[i])}</span>
                  <span>{row.feature.toLowerCase()}</span>
                </li>
              ))}
              {listed.map((row) => (
                <li key={row.feature} className="flex gap-2.5 text-[15px] leading-snug text-sea">
                  <Check className="h-5 w-5 text-sea shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span>{row.feature}</span>
                </li>
              ))}
            </ul>

            {column.footnote && <p className="text-xs text-slate-brand mt-4">{column.footnote}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default function ComparisonTable({ title, intro, columns, rows }: ComparisonTableProps) {
  const width = columns.length > 2 ? "w-[20%]" : "w-[22%]";
  const hasFootnotes = columns.some((c) => c.footnote);
  const planNames = columns.map((c) => c.plan).join(", ");

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">{title}</h2>
        <p className="text-sm text-slate-brand mt-1">{intro}</p>
      </div>

      <PlanCards columns={columns} rows={rows} />

      <div className="hidden sm:block bg-white rounded-2xl p-4">
        <table className="w-full border-collapse text-sea">
          <caption className="sr-only">{title}: what the {planNames} plans include</caption>
          <thead>
            <tr className="border-b border-[#E6E9E8]">
              <th scope="col" className="text-left px-2 py-4 align-bottom text-xs font-bold uppercase tracking-[0.08em] text-slate-brand">
                What you get
              </th>
              {columns.map((column) => (
                <PriceHead key={column.plan} column={column} width={width} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-b border-[#E6E9E8] last:border-0">
                <th scope="row" className="text-left px-2 py-3 text-[15px] font-normal leading-snug">
                  {row.feature}
                </th>
                {columns.map((column, i) => (
                  <td key={column.plan} className="px-2 py-3 text-center">
                    <Cell value={row.values[i] ?? false} plan={column.plan} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {hasFootnotes && (
            <tfoot>
              <tr>
                <td className="px-2 pt-3" />
                {columns.map((column) => (
                  <td key={column.plan} className="px-2 pt-3 text-center text-xs text-slate-brand">
                    {column.footnote ?? ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
