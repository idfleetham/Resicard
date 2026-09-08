import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { categoryLabel, errorMessage, formatDate } from "@/components/resident/format";
import { fullName, type AdminMerchant } from "./types";
import { DESTRUCTIVE_OUTLINE, INPUT, Pill, SectionTitle, TD, TH, TR } from "@/components/merchant/portal-ui";
import { MERCHANT_PLAN_NAMES, normalisePlanKey } from "@/components/pricing/plan-features";
import { LocationPicker, type LocationValue } from "@/components/merchant/location-picker";

const STATUSES = ["all", "pending", "approved", "rejected"] as const;

function StatusBadge({ status }: { status: AdminMerchant["status"] }) {
  if (status === "approved") return <Pill tone="live">Approved</Pill>;
  if (status === "rejected") return <Pill tone="red">Rejected</Pill>;
  return <Pill tone="sand">Pending</Pill>;
}

export default function BusinessesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  // Which merchant's pin is being edited, and the coordinates as typed so far.
  const [placing, setPlacing] = useState<string | null>(null);
  const [draft, setDraft] = useState<LocationValue>({ latitude: "", longitude: "" });
  const url = status === "all" ? "/api/admin/merchants" : `/api/admin/merchants?status=${status}`;
  const { data: merchants = [], isLoading } = useQuery<AdminMerchant[]>({ queryKey: [url] });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
    for (const s of STATUSES) await queryClient.invalidateQueries({ queryKey: [`/api/admin/merchants?status=${s}`] });
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
  };

  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      (await apiRequest("POST", `/api/admin/merchants/${id}/${action}`)).json(),
    onSuccess: async (_res, vars) => {
      await refresh();
      toast({ title: vars.action === "approve" ? "Business approved" : "Business rejected" });
    },
    onError: (err) => toast({ title: "Could not update", description: errorMessage(err), variant: "destructive" }),
  });

  const place = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: LocationValue }) =>
      (
        await apiRequest("PUT", `/api/admin/merchants/${id}`, {
          latitude: value.latitude.trim() === "" ? null : value.latitude,
          longitude: value.longitude.trim() === "" ? null : value.longitude,
        })
      ).json(),
    onSuccess: async () => {
      setPlacing(null);
      await refresh();
      toast({ title: "Location saved" });
    },
    onError: (err) => toast({ title: "Could not save", description: errorMessage(err), variant: "destructive" }),
  });

  const startPlacing = (m: AdminMerchant) => {
    setPlacing(m.id);
    setDraft({ latitude: m.latitude ?? "", longitude: m.longitude ?? "" });
  };

  return (
    <div className="bg-white rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionTitle>Businesses</SectionTitle>
        <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
          <SelectTrigger className={`${INPUT} w-40`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
      ) : merchants.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-brand">No businesses match.</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E6E9E8] hover:bg-transparent">
                <TableHead className={TH}>Business</TableHead>
                <TableHead className={TH}>Owner</TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={TH}>Plan</TableHead>
                <TableHead className={`${TH} text-right`}>Offers</TableHead>
                <TableHead className={`${TH} text-right`}>Favourites</TableHead>
                <TableHead className={TH}>Joined</TableHead>
                <TableHead className={TH}>Map</TableHead>
                <TableHead className={TH} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.map((m) => (
                <Fragment key={m.id}>
                <TableRow className={TR}>
                  <TableCell className={TD}>
                    <div className="font-bold">{m.name}</div>
                    <div className="text-xs text-slate-brand">{categoryLabel(m.category)}{m.address ? ` · ${m.address}` : ""}</div>
                  </TableCell>
                  <TableCell className={TD}>
                    {m.owner ? (
                      <>
                        <div>{fullName(m.owner)}</div>
                        <div className="text-xs text-slate-brand">{m.owner.email}</div>
                      </>
                    ) : "-"}
                  </TableCell>
                  <TableCell className={TD}><StatusBadge status={m.status} /></TableCell>
                  <TableCell className={TD}>{MERCHANT_PLAN_NAMES[normalisePlanKey(m.planStatus)]}</TableCell>
                  <TableCell className={`${TD} text-right`}>{m.offerCount}</TableCell>
                  <TableCell className={`${TD} text-right`}>{m.favouriteCount ?? 0}</TableCell>
                  <TableCell className={`${TD} whitespace-nowrap`}>{formatDate(m.createdAt)}</TableCell>
                  <TableCell className={`${TD} whitespace-nowrap`}>
                    <button
                      type="button"
                      onClick={() => (placing === m.id ? setPlacing(null) : startPlacing(m))}
                      className="text-sm font-bold text-sea underline underline-offset-2"
                    >
                      {m.latitude && m.longitude ? "Placed" : "Not placed"}
                    </button>
                  </TableCell>
                  <TableCell className={`${TD} text-right whitespace-nowrap`}>
                    {m.status !== "approved" && (
                      <Button size="sm" className="h-9 px-4 mr-2" onClick={() => decide.mutate({ id: m.id, action: "approve" })} disabled={decide.isPending}>Approve</Button>
                    )}
                    {m.status !== "rejected" && (
                      <Button size="sm" variant="outline" className={`h-9 px-4 ${DESTRUCTIVE_OUTLINE}`} onClick={() => decide.mutate({ id: m.id, action: "reject" })} disabled={decide.isPending}>Reject</Button>
                    )}
                  </TableCell>
                </TableRow>
                {placing === m.id && (
                  <TableRow className="hover:bg-transparent border-[#E6E9E8]">
                    <TableCell className={TD} colSpan={9}>
                      <div className="max-w-md space-y-3 py-2">
                        <LocationPicker value={draft} onChange={setDraft} />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-9 px-4" onClick={() => place.mutate({ id: m.id, value: draft })} disabled={place.isPending}>Save location</Button>
                          <Button size="sm" variant="outline" className="h-9 px-4" onClick={() => setPlacing(null)}>Cancel</Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
