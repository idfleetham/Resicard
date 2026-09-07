import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate } from "@/components/resident/format";
import { DOCUMENT_LABELS, fullName, type PendingDocumentUser } from "./types";

const KEY = ["/api/admin/documents/pending"];

function DocumentViewer({ file }: { file: string | null }) {
  if (!file) return <p className="text-sm text-slate-500">No file attached.</p>;
  if (file.startsWith("data:application/pdf")) {
    return <iframe title="Document" src={file} className="w-full h-[28rem] rounded-lg border border-slate-200 bg-white" />;
  }
  return <img src={file} alt="Residency document" className="max-h-[28rem] w-auto max-w-full rounded-lg border border-slate-200 bg-white" />;
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

  if (isLoading) return <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />;
  if (pending.length === 0) {
    return <Card><CardContent className="p-8 text-center text-slate-600">No residency checks waiting.</CardContent></Card>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-5">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Waiting ({pending.length})</CardTitle></CardHeader>
        <CardContent className="p-2">
          <ul className="space-y-1">
            {pending.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 min-h-[3rem] ${selected?.id === p.id ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50"}`}
                >
                  <p className="font-medium text-slate-900">{fullName(p)}</p>
                  <p className="text-xs text-slate-500">{p.postcode ?? "No postcode"} · {p.documentSubmittedAt ? formatDate(p.documentSubmittedAt) : ""}</p>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{fullName(selected)}</CardTitle>
                <p className="text-sm text-slate-600 mt-1">{selected.email} · {selected.username}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">{selected.postcode ?? "No postcode"}</Badge>
                  <Badge variant="outline">{DOCUMENT_LABELS[selected.documentType ?? ""] ?? selected.documentType ?? "Document"}</Badge>
                  {selected.documentSubmittedAt && <Badge variant="outline">Sent {formatDate(selected.documentSubmittedAt)}</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="h-11 bg-green-600 hover:bg-green-700" onClick={() => approve.mutate(selected.id)} disabled={approve.isPending}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button variant="outline" className="h-11 text-red-600" onClick={() => setRejecting(selected)}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">Check the name and address match the postcode given.</p>
            <DocumentViewer file={selected.documentFile} />
          </CardContent>
        </Card>
      )}

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject document for {rejecting ? fullName(rejecting) : ""}</DialogTitle>
            <DialogDescription>The resident sees this reason and can send another document.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (rejecting) reject.mutate({ userId: rejecting.id, why: reason }); }}>
            <div>
              <Label htmlFor="reject-reason">Reason</Label>
              <Input id="reject-reason" className="h-11" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Address on the document does not match the postcode" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setRejecting(null)}>Cancel</Button>
              <Button type="submit" variant="destructive" className="h-11" disabled={!reason || reject.isPending}>Reject</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
