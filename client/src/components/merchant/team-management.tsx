import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";

interface TeamMember {
  id: number;
  username: string;
  firstName: string | null;
  surname: string | null;
  hasPin: boolean;
}

const EMPTY = { firstName: "", surname: "", username: "", email: "", password: "", staffPin: "" };
const KEY = ["/api/merchant/team"];

export default function TeamManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const { data: team = [], isLoading } = useQuery<TeamMember[]>({ queryKey: KEY });
  const ownerId = user?.merchant?.ownerUserId;

  const add = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/merchant/team", form)).json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      setOpen(false);
      setForm(EMPTY);
      toast({ title: "Staff member added" });
    },
    onError: (err) => toast({ title: "Could not add staff member", description: errorMessage(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/merchant/team/${id}`)).json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: "Staff member removed" });
    },
    onError: (err) => toast({ title: "Could not remove", description: errorMessage(err), variant: "destructive" }),
  });

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const pinOk = /^\d{4}$/.test(form.staffPin);
  const canSubmit = form.firstName && form.surname && form.username.length >= 3 && form.email && form.password.length >= 8 && pinOk;

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Team</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Staff sign in to see redemptions and use their PIN to award loyalty points.</p>
        </div>
        <Button className="h-11 shrink-0" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add staff</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-2">{[0, 1].map((i) => <div key={i} className="h-12 bg-slate-100 rounded" />)}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {team.map((m) => {
              const isOwner = m.id === ownerId;
              return (
                <li key={m.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {[m.firstName, m.surname].filter(Boolean).join(" ") || m.username}
                      {isOwner && <Badge variant="secondary" className="ml-2">Owner</Badge>}
                    </p>
                    <p className="text-sm text-slate-500">{m.username} · {m.hasPin ? "PIN set" : "No PIN"}</p>
                  </div>
                  {!isOwner && (
                    <Button variant="ghost" size="icon" className="h-11 w-11 text-red-600" aria-label="Remove" onClick={() => remove.mutate(m.id)} disabled={remove.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a staff member</DialogTitle>
            <DialogDescription>They get their own login for this outlet and a 4-digit PIN for the till.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="fn">First name</Label><Input id="fn" className="h-11" value={form.firstName} onChange={set("firstName")} /></div>
              <div><Label htmlFor="sn">Surname</Label><Input id="sn" className="h-11" value={form.surname} onChange={set("surname")} /></div>
            </div>
            <div><Label htmlFor="un">Username</Label><Input id="un" className="h-11" value={form.username} onChange={set("username")} autoComplete="off" /></div>
            <div><Label htmlFor="em">Email</Label><Input id="em" type="email" className="h-11" value={form.email} onChange={set("email")} autoComplete="off" /></div>
            <div><Label htmlFor="pw">Password (8+ characters)</Label><Input id="pw" type="password" className="h-11" value={form.password} onChange={set("password")} autoComplete="new-password" /></div>
            <div>
              <Label htmlFor="pin">Staff PIN (4 digits)</Label>
              <Input id="pin" inputMode="numeric" maxLength={4} pattern="\d{4}" className="h-11 max-w-[8rem] tracking-widest" value={form.staffPin} onChange={set("staffPin")} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-11" disabled={!canSubmit || add.isPending}>{add.isPending ? "Adding" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
