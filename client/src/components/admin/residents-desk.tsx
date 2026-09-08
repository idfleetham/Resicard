import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate } from "@/components/resident/format";
import { INPUT, Pill, SectionTitle } from "@/components/merchant/portal-ui";
import { addressLines, type AdminResident } from "./types";

const FILTERS = ["all", "false", "true"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = { all: "Everyone", false: "Not verified", true: "Verified" };
const METHOD_LABEL: Record<string, string> = { postcard: " by postcard", outlet: " at an outlet", in_person: " in person" };

function membershipLabel(m: AdminResident["membership"]): string {
  if (m.status === "active" && m.expiry) return `${m.plan === "household" ? "Household" : "Member"} to ${formatDate(m.expiry)}`;
  return m.status.charAt(0).toUpperCase() + m.status.slice(1);
}

export default function ResidentsDesk() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirming, setConfirming] = useState<AdminResident | null>(null);

  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (filter !== "all") params.set("verified", filter);
  const url = `/api/admin/residents${params.toString() ? `?${params}` : ""}`;
  const { data: residents = [], isLoading } = useQuery<AdminResident[]>({ queryKey: [url] });

  const refresh = async () => {
    await queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/admin/") });
  };

  const verify = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/admin/residents/${id}/verify`, {})).json(),
    onSuccess: async () => { setConfirming(null); await refresh(); toast({ title: "Verified in person" }); },
    onError: (err) => toast({ title: "Could not verify", description: errorMessage(err), variant: "destructive" }),
  });

  const unverify = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/admin/residents/${id}/unverify`)).json(),
    onSuccess: async () => { await refresh(); toast({ title: "Verification removed" }); },
    onError: (err) => toast({ title: "Could not remove", description: errorMessage(err), variant: "destructive" }),
  });

  return (
    <div className="bg-white rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <SectionTitle>Residents ({residents.length})</SectionTitle>
        <div className="flex gap-2">
          <Input placeholder="Search name, email or address" className={`${INPUT} sm:w-72`} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className={`${INPUT} w-40`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => <SelectItem key={f} value={f}>{FILTER_LABEL[f]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-slate-brand mb-3">For the desk at a Resicard event. Verify someone once you have seen something with their name and address on it.</p>

      {isLoading ? (
        <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
      ) : residents.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-brand">No residents match.</p>
      ) : (
        <ul className="divide-y divide-[#E6E9E8]">
          {residents.map((r) => {
            const lines = addressLines(r.address);
            return (
              <li key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sea">{r.name}</span>
                    {r.verified ? (
                      <Pill tone="live">Verified{METHOD_LABEL[r.method ?? ""] ?? ""}</Pill>
                    ) : (
                      <Pill tone="slate">Not verified</Pill>
                    )}
                    <Pill tone={r.membership.status === "active" ? "sea" : "slate"}>{membershipLabel(r.membership)}</Pill>
                  </div>
                  <div className="text-sm text-sea mt-1">{lines.length ? lines.join(", ") : <span className="text-slate-brand">No address on file</span>}</div>
                  <div className="text-xs text-slate-brand mt-0.5">{r.email} · {r.username}{r.verifiedAt ? ` · verified ${formatDate(r.verifiedAt)}` : ""}</div>
                  {/* Who did it, so a verification can be traced back to an outlet and a person before it is removed. */}
                  {r.verified && (r.verifiedByOutlet || r.verifiedByUser) && (
                    <div className="text-xs text-slate-brand mt-0.5">
                      By {[r.verifiedByOutlet?.name, r.verifiedByUser].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.verified ? (
                    <Button variant="ghost" className="h-12 px-5 text-slate-brand" disabled={unverify.isPending} onClick={() => unverify.mutate(r.id)}>
                      Remove verification
                    </Button>
                  ) : (
                    <Button className="h-12 px-6" onClick={() => setConfirming(r)}>
                      <Check className="h-4 w-4" /> Verify in person
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">Verify {confirming?.name}</DialogTitle>
            <DialogDescription>You have seen something with this person's name and address on it?</DialogDescription>
          </DialogHeader>
          {confirming && (
            <div className="bg-foam rounded-xl p-4 text-sm text-sea">
              {addressLines(confirming.address).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-12 px-6 bg-white" onClick={() => setConfirming(null)}>Not yet</Button>
            <Button type="button" className="h-12 px-6" disabled={verify.isPending} onClick={() => confirming && verify.mutate(confirming.id)}>
              {verify.isPending ? "Saving" : "Yes, verify"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
