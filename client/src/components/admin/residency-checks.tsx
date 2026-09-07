import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate } from "@/components/resident/format";
import { DOCUMENT_LABELS, fullName, type PendingDocumentUser } from "./types";
import { DESTRUCTIVE_OUTLINE, EmptyNote, INPUT, Pill, SectionTitle } from "@/components/merchant/portal-ui";

const KEY = ["/api/admin/documents/pending"];

function DocumentViewer({ file }: { file: string | null }) {
  if (!file) return <p className="text-sm text-slate-brand">No file attached.</p>;
  if (file.startsWith("data:application/pdf")) {
    return <iframe title="Document" src={file} className="w-full h-[28rem] rounded-2xl border border-[#E6E9E8] bg-white" />;
  }
  return (
    <div className="rounded-2xl border border-[#E6E9E8] bg-white p-3 inline-block max-w-full">
      <img src={file} alt="Residency document" className="max-h-[28rem] w-auto max-w-full rounded-xl" />
    </div>
  );
}

export default function ResidencyChecks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: pending = [], isLoading } = useQuery<PendingDocumentUser[]>({ queryKey: KEY });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<PendingDocumentUser | null>(null);
  const [reason, setReason] = useState("");

  const selected = pending.find((p) => p.id === selectedId) ?? pending[0] ?? null;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: KEY });
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
  };

  const approve = useMutation({
    mutationFn: async (userId: number) => (await apiRequest("POST", `/api/admin/documents/${userId}/approve`)).json(),
    onSuccess: async () => { await refresh(); toast({ title: "Residency approved" }); },
    onError: (err) => toast({ title: "Could not approve", description: errorMessage(err), variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async ({ userId, why }: { userId: number; why: string }) =>
      (await apiRequest("POST", `/api/admin/documents/${userId}/reject`, { reason: why })).json(),
    onSuccess: async () => { await refresh(); setRejecting(null); setReason(""); toast({ title: "Document rejected" }); },
    onError: (err) => toast({ title: "Could not reject", description: errorMessage(err), variant: "destructive" }),
  });

  if (isLoading) return <div className="h-64 bg-white rounded-2xl animate-pulse" />;
  if (pending.length === 0) {
    return <EmptyNote>No residency checks waiting.</EmptyNote>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-3 items-start">
      <div className="bg-white rounded-2xl p-3">
        <SectionTitle className="px-2 pt-2 pb-3">Waiting ({pending.length})</SectionTitle>
        <ul className="space-y-1">
          {pending.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left rounded-xl px-3 py-2 min-h-12 transition-colors ${selected?.id === p.id ? "bg-sea text-foam" : "text-sea hover:bg-foam"}`}
              >
                <p className="font-bold">{fullName(p)}</p>
                <p className={`text-xs ${selected?.id === p.id ? "text-foam/80" : "text-slate-brand"}`}>
                  {p.postcode ?? "No postcode"} · {p.documentSubmittedAt ? formatDate(p.documentSubmittedAt) : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="bg-white rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <SectionTitle>{fullName(selected)}</SectionTitle>
              <p className="text-sm text-slate-brand mt-1">{selected.email} · {selected.username}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Pill tone="sand">{selected.postcode ?? "No postcode"}</Pill>
                <Pill tone="slate">{DOCUMENT_LABELS[selected.documentType ?? ""] ?? selected.documentType ?? "Document"}</Pill>
                {selected.documentSubmittedAt && <Pill tone="slate">Sent {formatDate(selected.documentSubmittedAt)}</Pill>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button className="h-12 px-6" onClick={() => approve.mutate(selected.id)} disabled={approve.isPending}>
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button variant="outline" className={`h-12 px-6 ${DESTRUCTIVE_OUTLINE}`} onClick={() => setRejecting(selected)}>
                <X className="h-4 w-4" /> Reject
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-brand mt-5 mb-3">Check the name and address match the postcode given.</p>
          <DocumentViewer file={selected.documentFile} />
        </div>
      )}

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">Reject document for {rejecting ? fullName(rejecting) : ""}</DialogTitle>
            <DialogDescription>The resident sees this reason and can send another document.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (rejecting) reject.mutate({ userId: rejecting.id, why: reason }); }}>
            <div className="space-y-1">
              <Label htmlFor="reject-reason" className="text-xs text-slate-brand">Reason</Label>
              <Input id="reject-reason" className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Address on the document does not match the postcode" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="h-12 px-6 bg-white" onClick={() => setRejecting(null)}>Cancel</Button>
              <Button type="submit" variant="outline" className={`h-12 px-6 ${DESTRUCTIVE_OUTLINE}`} disabled={!reason || reject.isPending}>Reject</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
