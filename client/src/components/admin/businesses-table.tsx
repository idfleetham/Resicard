import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { categoryLabel, errorMessage, formatDate } from "@/components/resident/format";
import { fullName, type AdminMerchant } from "./types";

const STATUSES = ["all", "pending", "approved", "rejected"] as const;

function StatusBadge({ status }: { status: AdminMerchant["status"] }) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
}

export default function BusinessesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
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

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 gap-3">
        <CardTitle className="text-lg">Businesses</CardTitle>
        <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
          <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0 sm:p-4 sm:pt-0">
        {isLoading ? (
          <div className="p-4 animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}</div>
        ) : merchants.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No businesses match.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Offers</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchants.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-slate-500">{categoryLabel(m.category)}{m.address ? ` · ${m.address}` : ""}</div>
                    </TableCell>
                    <TableCell>
                      {m.owner ? (
                        <>
                          <div>{fullName(m.owner)}</div>
                          <div className="text-xs text-slate-500">{m.owner.email}</div>
                        </>
                      ) : "-"}
                    </TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                    <TableCell className="capitalize">{m.planStatus ?? "-"}</TableCell>
                    <TableCell className="text-right">{m.offerCount}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(m.createdAt)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {m.status !== "approved" && (
                        <Button size="sm" className="h-10 bg-green-600 hover:bg-green-700 mr-2" onClick={() => decide.mutate({ id: m.id, action: "approve" })} disabled={decide.isPending}>Approve</Button>
                      )}
                      {m.status !== "rejected" && (
                        <Button size="sm" variant="outline" className="h-10 text-red-600" onClick={() => decide.mutate({ id: m.id, action: "reject" })} disabled={decide.isPending}>Reject</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
