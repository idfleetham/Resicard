import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicUser } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/components/resident/format";
import { fullName } from "./types";
import { INPUT, Pill, SectionTitle, TD, TH, TR } from "@/components/merchant/portal-ui";

const ROLES = ["all", "resident", "merchant", "admin"] as const;

function residencyBadge(u: PublicUser) {
  if (u.role !== "resident") return null;
  if (u.isResidencyVerified) return <Pill tone="live">{u.verificationMethod === "in_person" ? "Verified in person" : "Verified"}</Pill>;
  return <Pill tone="slate">Not verified</Pill>;
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
    <div className="bg-white rounded-2xl border border-hairline p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <SectionTitle>Users ({shown.length})</SectionTitle>
        <div className="flex gap-2">
          <Input placeholder="Search name or email" className={`${INPUT} sm:w-64`} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={role} onValueChange={(v) => setRole(v as (typeof ROLES)[number])}>
            <SelectTrigger className={`${INPUT} w-36`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{r === "all" ? "All roles" : r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isLoading ? (
        <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-brand">No users match.</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E6E9E8] hover:bg-transparent">
                <TableHead className={TH}>Name</TableHead>
                <TableHead className={TH}>Role</TableHead>
                <TableHead className={TH}>Postcode</TableHead>
                <TableHead className={TH}>Residency</TableHead>
                <TableHead className={TH}>Membership</TableHead>
                <TableHead className={TH}>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((u) => (
                <TableRow key={u.id} className={TR}>
                  <TableCell className={TD}>
                    <div className="font-bold">{fullName(u)}</div>
                    <div className="text-xs text-slate-brand">{u.email} · {u.username}</div>
                  </TableCell>
                  <TableCell className={`${TD} capitalize`}>{u.role}</TableCell>
                  <TableCell className={TD}>{u.postcode ?? "-"}</TableCell>
                  <TableCell className={TD}>{residencyBadge(u) ?? "-"}</TableCell>
                  <TableCell className={`${TD} capitalize whitespace-nowrap`}>{membershipLabel(u)}</TableCell>
                  <TableCell className={`${TD} whitespace-nowrap`}>{formatDate(u.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
