import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRequireRole } from "@/hooks/use-auth";
import { useMerchantOffer } from "@/hooks/use-merchant-offers";
import OfferForm from "@/components/merchant/offer-form";
import type { RedemptionSummary } from "@/components/merchant/overview-tab";
import {
  OFFER_TYPE_LABELS, categoryLabel, formatDate, formatPounds, offerConditions, offerHeadline, offerWhen,
} from "@/components/resident/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-2 border-b border-slate-100 last:border-0 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
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
  const limits: string[] = [];
  if (offer?.maxPerDay) limits.push(`${offer.maxPerDay} per resident per day`);
  if (offer?.maxPerWeek) limits.push(`${offer.maxPerWeek} per resident per week`);
  if (offer?.maxLifetime) limits.push(`${offer.maxLifetime} per resident ever`);
  if (offer?.globalUsageLimit) limits.push(`${offer.globalUsageLimit} in total`);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-5 sm:py-8 space-y-4">
        <Button asChild variant="ghost" className="h-11 -ml-3">
          <Link href="/merchant?tab=offers"><ArrowLeft className="h-4 w-4 mr-1" /> All offers</Link>
        </Button>

        {!ready || isLoading ? (
          <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
        ) : !offer ? (
          <Card><CardContent className="p-6 text-slate-600">{error ? "This offer could not be loaded." : "Offer not found."}</CardContent></Card>
        ) : (
          <>
            <Card>
              {offer.imageUrl && <img src={offer.imageUrl} alt="" className="w-full h-48 object-cover rounded-t-xl" />}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-2xl">{offer.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">{offerHeadline(offer)}</Badge>
                      <Badge variant="outline">{OFFER_TYPE_LABELS[offer.type ?? "percentage_discount"]}</Badge>
                      {offer.archived ? <Badge variant="outline">Archived</Badge> : offer.active
                        ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Live</Badge>
                        : <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Paused</Badge>}
                    </div>
                  </div>
                  {!offer.archived && (
                    <Button className="h-11 shrink-0" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-slate-50 p-4 mb-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">{count}</span>
                  <span className="text-slate-600">redemption{count === 1 ? "" : "s"}</span>
                </div>
                <dl>
                  {offer.shortPromo && <Row label="Short promo">{offer.shortPromo}</Row>}
                  {offer.description && <Row label="Description">{offer.description}</Row>}
                  <Row label="Category">{categoryLabel(offer.category)}</Row>
                  {(offer.fixedPrice || offer.originalValue) && (
                    <Row label="Price">
                      {offer.fixedPrice ? formatPounds(offer.fixedPrice) : "-"}
                      {offer.originalValue ? <span className="text-slate-500"> (usually {formatPounds(offer.originalValue)})</span> : null}
                    </Row>
                  )}
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
              </CardContent>
            </Card>
            <OfferForm open={editing} onOpenChange={setEditing} offer={offer} />
          </>
        )}
      </main>
    </div>
  );
}
