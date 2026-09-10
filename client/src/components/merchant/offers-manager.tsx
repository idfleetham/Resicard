import { useState } from "react";
import { Link } from "wouter";
import { Plus, Pencil, Archive, Pause, Play } from "lucide-react";
import type { Offer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArchiveOffer, useMerchantOffers, useToggleOffer } from "@/hooks/use-merchant-offers";
import { offerHeadline, offerWhen } from "@/components/resident/format";
import OfferForm from "./offer-form";
import QrCodeTab from "./qr-code-tab";
import { usePlan } from "./plan-tab";
import { CARD, Pill, Skeleton } from "./portal-ui";

function FreePlanNote() {
  const { data: plan } = usePlan();
  if (!plan || plan.planStatus !== "free") return null;
  return (
    <p className="bg-sand rounded-2xl px-5 py-3 text-sm text-sea">
      Free plan: {plan.liveOfferCount} of {plan.freeLiveOfferLimit} live offers. Standard and Insight have no limit.{" "}
      <Link href="/merchant?tab=plan" className="font-bold underline underline-offset-2">See the plans</Link>
    </p>
  );
}

export function OfferStatusPill({ offer }: { offer: Pick<Offer, "active" | "archived"> }) {
  if (offer.archived) return <Pill tone="slate">Archived</Pill>;
  if (offer.active) return <Pill tone="live">Live</Pill>;
  return <Pill tone="sand">Paused</Pill>;
}

function OfferRow({ offer, onEdit, onArchive }: { offer: Offer; onEdit: () => void; onArchive: () => void }) {
  const toggle = useToggleOffer();
  const when = offerWhen(offer);
  return (
    <div className="bg-white rounded-2xl border border-hairline p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/merchant/offers/${offer.id}`} className="font-bold text-sea hover:underline truncate">
            {offer.title}
          </Link>
          <Pill tone="buoy">{offerHeadline(offer)}</Pill>
          <OfferStatusPill offer={offer} />
        </div>
        <p className="text-sm text-slate-brand mt-1">
          {when.length ? when.join(" / ") : "Every day, all day"}
          {" · "}
          Used {offer.usageCount ?? 0} time{(offer.usageCount ?? 0) === 1 ? "" : "s"}
          {offer.globalUsageLimit ? ` of ${offer.globalUsageLimit}` : ""}
        </p>
      </div>
      {!offer.archived && (
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 px-4 flex-1 sm:flex-none bg-white" onClick={() => toggle.mutate(offer.id)} disabled={toggle.isPending}>
            {offer.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {offer.active ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" className="h-11 px-4 flex-1 sm:flex-none bg-white" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-brand" aria-label="Archive" onClick={onArchive}>
            <Archive className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Group({ title, offers, onEdit, onArchive }: { title: string; offers: Offer[]; onEdit: (o: Offer) => void; onArchive: (o: Offer) => void }) {
  if (!offers.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-brand uppercase tracking-[0.08em]">{title} ({offers.length})</h3>
      {offers.map((o) => (
        <OfferRow key={o.id} offer={o} onEdit={() => onEdit(o)} onArchive={() => onArchive(o)} />
      ))}
    </div>
  );
}

export default function OffersManager({ merchantName }: { merchantName: string }) {
  const { data: offers = [], isLoading } = useMerchantOffers();
  const archive = useArchiveOffer();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [toArchive, setToArchive] = useState<Offer | null>(null);

  const active = offers.filter((o) => !o.archived && o.active);
  const paused = offers.filter((o) => !o.archived && !o.active);
  const archived = offers.filter((o) => o.archived);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (o: Offer) => { setEditing(o); setFormOpen(true); };

  return (
    /*
      The code and the offers are one thought — this is what a resident scans,
      and that is what they get when they do — so the poster sits beside the
      list rather than in a tab of its own.
    */
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-3 items-start">
    <div className="space-y-6">
      {/*
        The tab opens on the number that matters rather than a sentence of
        explanation: how many offers a resident can actually see right now.
      */}
      <div className={`${CARD} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="flex items-baseline gap-3 shrink-0">
          <span className="font-display font-extrabold text-[44px] leading-none tracking-[-0.03em] text-sea tabular-nums">
            {isLoading ? "—" : active.length}
          </span>
          <span className="font-display font-bold text-lg text-slate-brand">
            {active.length === 1 ? "offer live" : "offers live"}
          </span>
        </div>
        <p className="text-sm text-slate-brand flex-1 min-w-0">
          {active.length === 0
            ? "Residents who scan your code right now see nothing to redeem."
            : "This is what a resident sees on their card and can pick from when they scan your code."}
        </p>
        <Button variant="buoy" className="h-12 px-6 shrink-0" onClick={openNew}>
          <Plus className="h-4 w-4" /> New offer
        </Button>
      </div>

      <FreePlanNote />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-sand rounded-2xl p-8 text-center space-y-3">
          <p className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">No offers yet</p>
          <p className="text-sm text-sea">Residents who scan your code will see nothing until you add one.</p>
          <Button variant="outline" className="h-12 px-6 bg-white" onClick={openNew}>Create your first offer</Button>
        </div>
      ) : (
        <>
          <Group title="Live" offers={active} onEdit={openEdit} onArchive={setToArchive} />
          <Group title="Paused" offers={paused} onEdit={openEdit} onArchive={setToArchive} />
          <Group title="Archived" offers={archived} onEdit={openEdit} onArchive={setToArchive} />
        </>
      )}

      <OfferForm open={formOpen} onOpenChange={setFormOpen} offer={editing} />

      <AlertDialog open={!!toArchive} onOpenChange={(open) => !open && setToArchive(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">Archive this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toArchive?.title}" will stop showing to residents. Its redemption history is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-full">Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-full"
              onClick={() => { if (toArchive) archive.mutate(toArchive.id); setToArchive(null); }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

      <QrCodeTab merchantName={merchantName} />
    </div>
  );
}
