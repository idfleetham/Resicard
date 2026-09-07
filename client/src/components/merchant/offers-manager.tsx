import { useState } from "react";
import { Link } from "wouter";
import { Plus, Pencil, Archive, Pause, Play } from "lucide-react";
import type { Offer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArchiveOffer, useMerchantOffers, useToggleOffer } from "@/hooks/use-merchant-offers";
import { offerHeadline, offerWhen } from "@/components/resident/format";
import OfferForm from "./offer-form";

function OfferRow({ offer, onEdit, onArchive }: { offer: Offer; onEdit: () => void; onArchive: () => void }) {
  const toggle = useToggleOffer();
  const when = offerWhen(offer);
  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/merchant/offers/${offer.id}`} className="font-semibold text-slate-900 hover:underline truncate">
              {offer.title}
            </Link>
            <Badge variant="secondary">{offerHeadline(offer)}</Badge>
            {offer.archived ? (
              <Badge variant="outline">Archived</Badge>
            ) : offer.active ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Live</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Paused</Badge>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {when.length ? when.join(" / ") : "Every day, all day"}
            <span className="text-slate-400"> · </span>
            Used {offer.usageCount ?? 0} time{(offer.usageCount ?? 0) === 1 ? "" : "s"}
            {offer.globalUsageLimit ? ` of ${offer.globalUsageLimit}` : ""}
          </p>
        </div>
        {!offer.archived && (
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => toggle.mutate(offer.id)} disabled={toggle.isPending}>
              {offer.active ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {offer.active ? "Pause" : "Resume"}
            </Button>
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-500" aria-label="Archive" onClick={onArchive}>
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Group({ title, offers, onEdit, onArchive }: { title: string; offers: Offer[]; onEdit: (o: Offer) => void; onArchive: (o: Offer) => void }) {
  if (!offers.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title} ({offers.length})</h3>
      {offers.map((o) => (
        <OfferRow key={o.id} offer={o} onEdit={() => onEdit(o)} onArchive={() => onArchive(o)} />
      ))}
    </div>
  );
}

export default function OffersManager() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Residents see live offers on their card and can pick one when they scan your code.</p>
        <Button className="h-11 shrink-0" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> New offer
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
        </div>
      ) : offers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-slate-700">You have no offers yet.</p>
            <Button className="h-11" onClick={openNew}>Create your first offer</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Group title="Live" offers={active} onEdit={openEdit} onArchive={setToArchive} />
          <Group title="Paused" offers={paused} onEdit={openEdit} onArchive={setToArchive} />
          <Group title="Archived" offers={archived} onEdit={openEdit} onArchive={setToArchive} />
        </>
      )}

      <OfferForm open={formOpen} onOpenChange={setFormOpen} offer={editing} />

      <AlertDialog open={!!toArchive} onOpenChange={(open) => !open && setToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toArchive?.title}" will stop showing to residents. Its redemption history is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              onClick={() => { if (toArchive) archive.mutate(toArchive.id); setToArchive(null); }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
