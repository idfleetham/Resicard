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

export default function ComparisonTable({ title, intro, columns, rows }: ComparisonTableProps) {
  const width = columns.length > 2 ? "w-[20%]" : "w-[22%]";
  // Three columns plus a feature label do not fit on a phone, so the table keeps its
  // real type sizes and scrolls sideways inside the card instead.
  const minWidth = columns.length > 2 ? "min-w-[520px]" : "";
  const hasFootnotes = columns.some((c) => c.footnote);
  const planNames = columns.map((c) => c.plan).join(", ");

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">{title}</h2>
        <p className="text-sm text-slate-brand mt-1">{intro}</p>
      </div>

      <div className="bg-white rounded-2xl p-2 sm:p-4 overflow-x-auto">
        <table className={`w-full border-collapse text-sea ${minWidth}`}>
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
