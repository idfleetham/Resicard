import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { OfferType, PriceChangeField } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPounds, formatTime } from "@/components/resident/format";
import { INPUT, Pill, SectionTitle, TD, TH, TR } from "@/components/merchant/portal-ui";
import type { AdminMerchant, AdminPriceChange, AdminPriceChanges } from "./types";

/**
 * What merchants have changed on the figures behind their offers. The screen
 * states what changed and leaves the reading of it to the admin, so the wording
 * stays the same whoever is looking at it.
 */

const WINDOW_DAYS = 180;

const FIELD_LABELS: Record<PriceChangeField, string> = {
  percentOff: "Percentage off",
  fixedPrice: "Fixed price",
  originalValue: "Original value",
  typicalSpend: "Typical spend",
  itemValue: "Item value",
  minBasket: "Minimum basket",
  maxDiscount: "Maximum discount",
};

/** On a money-off offer the fixed price column holds the amount taken off, not a price. */
function fieldLabel(field: PriceChangeField, type: OfferType | null): string {
  if (field === "fixedPrice" && type === "fixed_amount_discount") return "Amount off";
  return FIELD_LABELS[field];
}

function formatValue(value: string | null, field: PriceChangeField): string {
  if (value === null) return "-";
  if (field === "percentOff") return `${Number(value)}%`;
  return formatPounds(value);
}

function formatMove(change: AdminPriceChange): string {
  if (change.percentMove === null) return change.direction === "set" ? "Set" : change.direction === "cleared" ? "Cleared" : "-";
  const percent = Math.round(change.percentMove * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

export default function PriceChanges() {
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [merchantId, setMerchantId] = useState("all");

  const params = new URLSearchParams({ days: String(WINDOW_DAYS) });
  if (flaggedOnly) params.set("flaggedOnly", "true");
  if (merchantId !== "all") params.set("merchantId", merchantId);
  const url = `/api/admin/price-changes?${params.toString()}`;

  const { data, isLoading } = useQuery<AdminPriceChanges>({ queryKey: [url] });
  const { data: merchants = [] } = useQuery<AdminMerchant[]>({ queryKey: ["/api/admin/merchants"] });
  const items = data?.items ?? [];
  const summary = data?.summary.merchants ?? [];

  return (
    <div className="space-y-3">
      {summary.length > 0 && (
        <div className="bg-white rounded-2xl p-5">
          <SectionTitle>Outlets with changes that increase a stated saving</SectionTitle>
          <ul className="mt-3 space-y-1.5">
            {summary.map((m) => (
              <li key={m.merchantId} className="text-sm text-sea">
                <span className="font-bold">{m.name}</span>
                <span className="text-[#0F3B47]/70">
                  {" · "}
                  {m.flaggedChanges} change{m.flaggedChanges === 1 ? "" : "s"}
                  {m.largestMovePercent !== null && `, largest +${Math.round(m.largestMovePercent * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <SectionTitle>Price changes</SectionTitle>
            <p className="text-xs text-slate-brand mt-1">Figures merchants changed on their offers in the last {WINDOW_DAYS} days.</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <label className="flex items-center gap-2 text-sm font-bold text-sea whitespace-nowrap">
              <Switch checked={flaggedOnly} onCheckedChange={setFlaggedOnly} />
              Increases stated saving only
            </label>
            <Select value={merchantId} onValueChange={setMerchantId}>
              <SelectTrigger className={`${INPUT} w-full sm:w-48`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outlets</SelectItem>
                {merchants.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-brand">
            {flaggedOnly ? "No changes that increase a stated saving in this window." : "No price changes recorded in this window."}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E6E9E8] hover:bg-transparent">
                  <TableHead className={TH}>When</TableHead>
                  <TableHead className={TH}>Outlet</TableHead>
                  <TableHead className={TH}>Offer</TableHead>
                  <TableHead className={TH}>Figure</TableHead>
                  <TableHead className={`${TH} text-right`}>Was</TableHead>
                  <TableHead className={`${TH} text-right`}>Now</TableHead>
                  <TableHead className={`${TH} text-right`}>Move</TableHead>
                  <TableHead className={TH}>Changed by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id} className={TR}>
                    <TableCell className={`${TD} whitespace-nowrap`}>
                      <span className="font-bold">{formatDate(c.changedAt)}</span>
                      <span className="text-xs text-slate-brand ml-2">{formatTime(c.changedAt)}</span>
                    </TableCell>
                    <TableCell className={TD}>{c.merchant.name}</TableCell>
                    <TableCell className={TD}>{c.offer.title}</TableCell>
                    <TableCell className={TD}>
                      <div>{fieldLabel(c.field, c.offer.type)}</div>
                      {c.inflatesSaving && <Pill tone="sand" className="mt-1">Increases stated saving</Pill>}
                    </TableCell>
                    <TableCell className={`${TD} text-right text-[#0F3B47]/70`}>{formatValue(c.oldValue, c.field)}</TableCell>
                    <TableCell className={`${TD} text-right font-bold`}>{formatValue(c.newValue, c.field)}</TableCell>
                    <TableCell className={`${TD} text-right whitespace-nowrap`}>{formatMove(c)}</TableCell>
                    <TableCell className={`${TD} text-slate-brand`}>{c.changedBy?.username ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
