import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicUser } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/components/resident/format";
import { fullName } from "./types";

const ROLES = ["all", "resident", "merchant", "admin"] as const;

function residencyBadge(u: PublicUser) {
  if (u.role !== "resident") return null;
  if (u.isResidencyVerified) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>;
  if (u.documentStatus === "pending") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Checking</Badge>;
  if (u.documentStatus === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Not verified</Badge>;
}

function membershipLabel(u: PublicUser): string {
  if (u.role !== "resident") return "-";
  if (u.membershipStatus === "active" && u.membershipExpiry) return `Active to ${formatDate(u.membershipExpiry)}`;
  return u.membershipStatus ?? "inactive";
}

export default function UsersTable() {
  const [role, setRole] = useState<(typeof ROLES)[number]>("all");
  const [search, setSearch] = useState("");
  const url = role === "all" ? "/api/admin/users" : `/api/admin/users?role=${role}`;
  const { data: users = [], isLoading } = useQuery<PublicUser[]>({ queryKey: [url] });

  const q = search.trim().toLowerCase();
  const shown = q
    ? users.filter((u) => fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    : users;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg">Users ({shown.length})</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search name or email" className="h-11 sm:w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={role} onValueChange={(v) => setRole(v as (typeof ROLES)[number])}>
              <SelectTrigger className="h-11 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r === "all" ? "All roles" : r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-4 sm:pt-0">
        {isLoading ? (
          <div className="p-4 animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}</div>
        ) : shown.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No users match.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Postcode</TableHead>
                  <TableHead>Residency</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{fullName(u)}</div>
                      <div className="text-xs text-slate-500">{u.email} · {u.username}</div>
                    </TableCell>
                    <TableCell className="capitalize">{u.role}</TableCell>
                    <TableCell>{u.postcode ?? "-"}</TableCell>
                    <TableCell>{residencyBadge(u) ?? "-"}</TableCell>
                    <TableCell className="capitalize whitespace-nowrap">{membershipLabel(u)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(u.createdAt)}</TableCell>
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
