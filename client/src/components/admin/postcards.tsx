import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate } from "@/components/resident/format";
import { EmptyNote, INPUT, Pill, SectionTitle, type PillTone } from "@/components/merchant/portal-ui";
import type { AdminPostcard } from "./types";

const QUEUE_KEY = ["/api/admin/postcards?status=requested"];
const STATUSES = ["posted", "used", "expired", "cancelled"] as const;
type Status = (typeof STATUSES)[number];
const TONE: Record<AdminPostcard["status"], PillTone> = { requested: "sand", posted: "sea", used: "live", expired: "slate", cancelled: "red" };

interface PostResponse {
  posted: { id: string; name: string; address: string; code: string }[];
  printHtml: string;
}

/** Opens the print sheet in a new tab. The blob URL is revoked once the tab has had time to load it. */
function openPrintSheet(html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const tab = window.open(url, "_blank");
  if (!tab) window.location.href = url;
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function AddressCell({ address }: { address: string }) {
  return <div className="text-sm leading-snug">{address.split("\n").map((l, i) => <div key={i}>{l}</div>)}</div>;
}

export default function Postcards() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>("posted");
  const { data: queue = [], isLoading } = useQuery<AdminPostcard[]>({ queryKey: QUEUE_KEY });
  const { data: others = [] } = useQuery<AdminPostcard[]>({ queryKey: [`/api/admin/postcards?status=${status}`] });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/postcards?status=requested"] });
    await queryClient.invalidateQueries({ queryKey: [`/api/admin/postcards?status=${status}`] });
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
  };

  const post = useMutation({
    mutationFn: async (ids: string[]) => (await apiRequest("POST", "/api/admin/postcards/post", { ids })).json() as Promise<PostResponse>,
    onSuccess: async (res) => {
      openPrintSheet(res.printHtml);
      setSelected(new Set());
      await refresh();
      toast({ title: `${res.posted.length} marked as posted`, description: "The print sheet has opened in a new tab." });
    },
    onError: (err) => toast({ title: "Could not post", description: errorMessage(err), variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/admin/postcards/${id}/cancel`)).json(),
    onSuccess: async () => { await refresh(); toast({ title: "Postcard cancelled" }); },
    onError: (err) => toast({ title: "Could not cancel", description: errorMessage(err), variant: "destructive" }),
  });

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = queue.length > 0 && queue.every((p) => selected.has(p.id));
  const count = selected.size;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <SectionTitle>To post ({queue.length})</SectionTitle>
          <Button variant="buoy" className="h-12 px-6" disabled={count === 0 || post.isPending} onClick={() => post.mutate(Array.from(selected))}>
            <Printer className="h-5 w-5" /> {post.isPending ? "Preparing" : `Mark ${count} as posted and print`}
          </Button>
        </div>
        <p className="text-xs text-slate-brand mb-3">Codes are generated when you mark cards as posted and appear only on the print sheet. Four A6 cards per A4 sheet.</p>
        {isLoading ? (
          <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
        ) : queue.length === 0 ? (
          <EmptyNote>No postcards waiting.</EmptyNote>
        ) : (
          <ul className="divide-y divide-[#E6E9E8]">
            <li className="flex items-center gap-3 py-2 text-xs text-slate-brand">
              <Checkbox checked={allSelected} onCheckedChange={(v) => setSelected(v ? new Set(queue.map((p) => p.id)) : new Set())} aria-label="Select all" />
              <span>Select all</span>
            </li>
            {queue.map((p) => (
              <li key={p.id} className="flex items-start gap-3 py-3">
                <Checkbox className="mt-1" checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sea">{p.name}</div>
                  <AddressCell address={p.address} />
                  <div className="text-xs text-slate-brand mt-1">Requested {formatDate(p.requestedAt)} · {p.email}</div>
                </div>
                <Button variant="ghost" className="h-10 px-4 text-slate-brand" disabled={cancel.isPending} onClick={() => cancel.mutate(p.id)}>Cancel</Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <SectionTitle>Sent ({others.length})</SectionTitle>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger className={`${INPUT} w-40`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {others.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-brand">Nothing {status} yet.</p>
        ) : (
          <ul className="divide-y divide-[#E6E9E8]">
            {others.map((p) => (
              <li key={p.id} className="flex items-start gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sea">{p.name}</div>
                  <AddressCell address={p.address} />
                  <div className="text-xs text-slate-brand mt-1">
                    {p.postedAt ? `Posted ${formatDate(p.postedAt)}` : `Requested ${formatDate(p.requestedAt)}`}
                    {p.expiresAt ? ` · expires ${formatDate(p.expiresAt)}` : ""}
                    {p.status === "posted" && p.attempts > 0 ? ` · ${p.attempts} wrong attempt${p.attempts === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
                <Pill tone={TONE[p.status]}>{p.status}</Pill>
                {p.status === "posted" && (
                  <Button variant="ghost" className="h-10 px-4 text-slate-brand" disabled={cancel.isPending} onClick={() => cancel.mutate(p.id)}>Cancel</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
