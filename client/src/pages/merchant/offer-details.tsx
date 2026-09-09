import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/hooks/use-auth";
import { useMerchantOffer } from "@/hooks/use-merchant-offers";
import OfferForm from "@/components/merchant/offer-form";
import { OfferStatusPill } from "@/components/merchant/offers-manager";
import { Pill } from "@/components/merchant/portal-ui";
import type { RedemptionSummary } from "@/components/merchant/overview-tab";
import {
  OFFER_TYPE_LABELS, categoryLabel, formatDate, formatPounds, needsIndicativeValue, offerConditions,
  offerHeadline, offerWhen,
} from "@/components/resident/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-3 border-b border-[#E6E9E8] last:border-0 text-sm">
      <dt className="text-slate-brand">{label}</dt>
      <dd className="text-sea">{children}</dd>
    </div>
  );
}

export default function OfferDetails() {
  const { ready } = useRequireRole("merchant");
  const { id } = useParams<{ id: string }>();
  const { data: offer, isLoading, error } = useMerchantOffer(ready ? id : undefined);
  const { data: summary } = useQuery<RedemptionSummary>({ queryKey: ["/api/merchant/redemptions/summary"], enabled: ready });
  const [editing, setEditing] = useState(false);

  const count = summary?.byOffer.find((o) => o.offerId === id)?.count ?? offer?.usageCount ?? 0;
  // The indicative figure this offer type needs, and whether the merchant set one.
  const indicative = needsIndicativeValue(offer?.type ?? null);
  const indicativeValue = indicative === "typicalSpend" ? offer?.typicalSpend : indicative === "itemValue" ? offer?.itemValue : null;
  const limits: string[] = [];
  if (offer?.maxPerDay) limits.push(`${offer.maxPerDay} per resident per day`);
  if (offer?.maxPerWeek) limits.push(`${offer.maxPerWeek} per resident per week`);
  if (offer?.maxLifetime) limits.push(`${offer.maxLifetime} per resident ever`);
  if (offer?.globalUsageLimit) limits.push(`${offer.globalUsageLimit} in total`);

  return (
    <div className="min-h-screen bg-mist text-sea">
      <Navigation />
      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-6 sm:py-10">
        <Link href="/merchant?tab=offers" className="inline-flex items-center gap-1 text-sm font-bold text-slate-brand hover:text-sea mb-4">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> All offers
        </Link>

        {!ready || isLoading ? (
          <div className="h-64 bg-white rounded-2xl animate-pulse" />
        ) : !offer ? (
          <div className="bg-sand rounded-2xl p-5 text-sm text-sea">{error ? "This offer could not be loaded." : "Offer not found."}</div>
        ) : (
          <>
            <div className="bg-white rounded-2xl overflow-hidden">
              {offer.imageUrl && <img src={offer.imageUrl} alt="" className="w-full h-48 object-cover" />}
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="font-display font-extrabold text-[32px] sm:text-[42px] leading-none tracking-[-0.03em]">{offer.title}</h1>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Pill tone="buoy">{offerHeadline(offer)}</Pill>
                      <Pill tone="slate">{OFFER_TYPE_LABELS[offer.type ?? "percentage_discount"]}</Pill>
                      <OfferStatusPill offer={offer} />
                    </div>
                  </div>
                  {!offer.archived && (
                    <Button variant="buoy" className="h-12 px-6 shrink-0" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
                  )}
                </div>
                <div className="rounded-2xl bg-sand p-5 my-5 flex items-baseline gap-2">
                  <span className="font-display font-extrabold text-[32px] leading-none tracking-[-0.03em]">{count}</span>
                  <span className="text-sm">redemption{count === 1 ? "" : "s"}</span>
                </div>
                <dl>
                  {offer.shortPromo && <Row label="Short promo">{offer.shortPromo}</Row>}
                  {offer.description && <Row label="Description">{offer.description}</Row>}
                  <Row label="Category">{categoryLabel(offer.category)}</Row>
                  {(offer.fixedPrice || offer.originalValue) && (
                    <Row label="Price">
                      {offer.fixedPrice ? formatPounds(offer.fixedPrice) : "-"}
                      {offer.originalValue ? <span className="text-slate-brand"> (usually {formatPounds(offer.originalValue)})</span> : null}
                    </Row>
                  )}
                  {indicative && indicativeValue ? (
                    <Row label={indicative === "typicalSpend" ? "Typical bill" : "Usual item price"}>
                      {formatPounds(indicativeValue)}
                      <span className="text-slate-brand"> (indicative, not a price residents see; used only to estimate what they save)</span>
                    </Row>
                  ) : indicative ? (
                    <Row label={indicative === "typicalSpend" ? "Typical bill" : "Usual item price"}>
                      <span className="text-slate-brand">Not set, so this offer does not count towards residents&apos; savings totals.</span>
                    </Row>
                  ) : null}
                  <Row label="When">{offerWhen(offer).join(" / ") || "Every day, all day"}</Row>
                  {offer.validFrom && <Row label="Valid from">{formatDate(offer.validFrom)}</Row>}
                  {offer.blackoutDates && offer.blackoutDates.length > 0 && (
                    <Row label="Blackout dates">
                      {offer.blackoutDates.map((b) => `${b.name || "Closed"}: ${formatDate(b.startDate)} to ${formatDate(b.endDate)}`).join("; ")}
                    </Row>
                  )}
                  <Row label="Limits">{limits.length ? limits.join(", ") : "None"}</Row>
                  <Row label="Conditions">{offerConditions(offer).join(", ") || "None"}</Row>
                  {offer.terms && <Row label="Terms">{offer.terms}</Row>}
                  {offer.tags && offer.tags.length > 0 && <Row label="Tags">{offer.tags.join(", ")}</Row>}
                  {offer.menuPdf && <Row label="Menu">PDF attached</Row>}
                  <Row label="Created">{formatDate(offer.createdAt)}</Row>
                </dl>
              </div>
            </div>
            <OfferForm open={editing} onOpenChange={setEditing} offer={offer} />
          </>
        )}
      </main>
    </div>
  );
}
