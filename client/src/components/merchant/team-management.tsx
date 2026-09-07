import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";
import { INPUT, Pill, SectionTitle } from "./portal-ui";

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

  const field = (id: string, label: string, input: React.ReactNode) => (
    <div>
      <Label htmlFor={id} className="text-xs text-slate-brand">{label}</Label>
      <div className="mt-1">{input}</div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-5 max-w-3xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <SectionTitle>Team</SectionTitle>
          <p className="text-xs text-slate-brand mt-1">Staff sign in to see redemptions and use their PIN to award loyalty points.</p>
        </div>
        <Button variant="outline" className="h-11 px-4 shrink-0 bg-white" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add staff</Button>
      </div>
      {isLoading ? (
        <div className="animate-pulse space-y-2">{[0, 1].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
      ) : (
        <ul className="divide-y divide-[#E6E9E8]">
          {team.map((m) => {
            const isOwner = m.id === ownerId;
            return (
              <li key={m.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sea truncate flex items-center gap-2">
                    {[m.firstName, m.surname].filter(Boolean).join(" ") || m.username}
                    {isOwner && <Pill tone="sand">Owner</Pill>}
                  </p>
                  <p className="text-sm text-slate-brand">{m.username} · {m.hasPin ? "PIN set" : "No PIN"}</p>
                </div>
                {!isOwner && (
                  <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-brand hover:text-[#B5321A]" aria-label="Remove" onClick={() => remove.mutate(m.id)} disabled={remove.isPending}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">Add a staff member</DialogTitle>
            <DialogDescription>They get their own login for this outlet and a 4-digit PIN for the till.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
            <div className="grid grid-cols-2 gap-3">
              {field("fn", "First name", <Input id="fn" className={INPUT} value={form.firstName} onChange={set("firstName")} />)}
              {field("sn", "Surname", <Input id="sn" className={INPUT} value={form.surname} onChange={set("surname")} />)}
            </div>
            {field("un", "Username", <Input id="un" className={INPUT} value={form.username} onChange={set("username")} autoComplete="off" />)}
            {field("em", "Email", <Input id="em" type="email" className={INPUT} value={form.email} onChange={set("email")} autoComplete="off" />)}
            {field("pw", "Password (8+ characters)", <Input id="pw" type="password" className={INPUT} value={form.password} onChange={set("password")} autoComplete="new-password" />)}
            {field("pin", "Staff PIN (4 digits)", <Input id="pin" inputMode="numeric" maxLength={4} pattern="\d{4}" className={`${INPUT} max-w-[8rem] tracking-widest`} value={form.staffPin} onChange={set("staffPin")} />)}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="h-12 px-6 bg-white" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="buoy" className="h-12 px-6" disabled={!canSubmit || add.isPending}>{add.isPending ? "Adding" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
