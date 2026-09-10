import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";
import { CARD, INPUT, Pill, SectionTitle } from "./portal-ui";

/**
 * Two different things, deliberately separated.
 *
 * **Till staff** are a name and a four-digit PIN. No email, no password, no
 * login. Awarding points used to require a full account per person, and no pub
 * is going to create eight logins for eight bar staff — so nobody had a PIN and
 * the till tool went unused. These are editable: names get spelled wrong, PINs
 * get shared and need changing, and people leave.
 *
 * **Portal logins** are real accounts for the one or two people who need to see
 * the numbers and change the offers.
 */

interface StaffMember {
  id: string;
  name: string;
  active: boolean;
}

interface TeamMember {
  id: number;
  username: string;
  firstName: string | null;
  surname: string | null;
  hasPin: boolean;
}

const STAFF_KEY = ["/api/merchant/staff"];
const TEAM_KEY = ["/api/merchant/team"];
const EMPTY_LOGIN = { firstName: "", surname: "", username: "", email: "", password: "", staffPin: "" };
const PIN_RE = /^\d{4}$/;

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs text-slate-brand">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------- till staff */

function StaffDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: StaffMember | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  // Reset when the dialog opens, so editing one person never shows another's name.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = editing?.id ?? "new";
  if (open && openedFor !== key) {
    setOpenedFor(key);
    setName(editing?.name ?? "");
    setPin("");
  }

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = { name: name.trim() };
      if (pin) body.pin = pin;
      return editing
        ? (await apiRequest("PUT", `/api/merchant/staff/${editing.id}`, body)).json()
        : (await apiRequest("POST", "/api/merchant/staff", { name: name.trim(), pin })).json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      onOpenChange(false);
      toast({ title: editing ? "Saved" : "Added to the till" });
    },
    onError: (err) => toast({ title: "Could not save", description: errorMessage(err), variant: "destructive" }),
  });

  // On an edit the PIN is optional: leaving it blank keeps the one they have.
  const pinOk = editing ? pin === "" || PIN_RE.test(pin) : PIN_RE.test(pin);
  const canSave = name.trim().length > 0 && pinOk;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">
            {editing ? "Edit staff member" : "Add someone to the till"}
          </DialogTitle>
          <DialogDescription>
            A name and a four-digit PIN. They do not get a login and cannot see your offers, plan or settings.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Field id="staff-name" label="Name">
            <Input id="staff-name" className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </Field>
          <Field id="staff-pin" label={editing ? "New PIN (leave blank to keep the current one)" : "PIN (4 digits)"}>
            <Input
              id="staff-pin"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              className={`${INPUT} max-w-[8rem] tracking-widest`}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="h-12 px-6 bg-white" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="buoy" className="h-12 px-6" disabled={!canSave || save.isPending}>
              {save.isPending ? "Saving" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TillStaff() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({ queryKey: STAFF_KEY });
  const onRota = staff.filter((s) => s.active).length;

  const patch = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await apiRequest("PUT", `/api/merchant/staff/${id}`, { active })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STAFF_KEY }),
    onError: (err) => toast({ title: "Could not change that", description: errorMessage(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/merchant/staff/${id}`)).json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      toast({ title: "Removed" });
    },
    onError: (err) => toast({ title: "Could not remove", description: errorMessage(err), variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <div className={`${CARD} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="flex items-baseline gap-3 shrink-0">
          <span className="font-display font-extrabold text-[44px] leading-none tracking-[-0.03em] text-sea tabular-nums">
            {isLoading ? "" : onRota}
          </span>
          <span className="font-display font-bold text-lg text-slate-brand">
            {onRota === 1 ? "PIN" : "PINs"}
          </span>
        </div>
        <p className="text-sm text-slate-brand flex-1 min-w-0">
          {onRota === 0
            ? "Nobody can award loyalty points at the till yet. Add whoever is working, with a PIN each."
            : "can award loyalty points at the till. No logins, no email addresses — just a name and a PIN."}
        </p>
        <Button
          variant="buoy"
          className="h-12 px-6 shrink-0"
          onClick={() => { setEditing(null); setOpen(true); }}
        >
          <Plus className="h-4 w-4" /> Add staff
        </Button>
      </div>

      <div className={`${CARD} p-5`}>
        <SectionTitle>Who works the till</SectionTitle>
        <p className="text-xs text-slate-brand mt-1 mb-3">
          Turn someone off when they leave rather than deleting them, and the record of who awarded what stays intact.
        </p>
        {isLoading ? (
          <div className="animate-pulse space-y-2">{[0, 1].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-slate-brand">Nobody added yet.</p>
        ) : (
          <ul className="divide-y divide-[#E6E9E8]">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sea truncate">{s.name}</p>
                  <p className="text-sm text-slate-brand">{s.active ? "PIN works at the till" : "PIN switched off"}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={s.active}
                    aria-label={`${s.name} can use the till`}
                    onCheckedChange={(active) => patch.mutate({ id: s.id, active })}
                    disabled={patch.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-slate-brand"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => { setEditing(s); setOpen(true); }}
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-slate-brand hover:text-[#B5321A]"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => remove.mutate(s.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <StaffDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

/* ------------------------------------------------------------ portal logins */

function PortalLogins() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_LOGIN);
  const { data: team = [], isLoading } = useQuery<TeamMember[]>({ queryKey: TEAM_KEY });
  const ownerId = user?.merchant?.ownerUserId;

  const add = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/merchant/team", form)).json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TEAM_KEY });
      setOpen(false);
      setForm(EMPTY_LOGIN);
      toast({ title: "Login created" });
    },
    onError: (err) => toast({ title: "Could not create the login", description: errorMessage(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/merchant/team/${id}`)).json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TEAM_KEY });
      toast({ title: "Login removed" });
    },
    onError: (err) => toast({ title: "Could not remove", description: errorMessage(err), variant: "destructive" }),
  });

  const set = (k: keyof typeof EMPTY_LOGIN) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const canSubmit =
    form.firstName && form.surname && form.username.length >= 3 && form.email && form.password.length >= 8 && PIN_RE.test(form.staffPin);

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle>Who can sign in</SectionTitle>
          <p className="text-xs text-slate-brand mt-1 mb-3 max-w-xl">
            A login is for the people who need to see the numbers and change the offers — usually just you. Bar staff do
            not need one; give them a PIN above instead.
          </p>
        </div>
        <Button variant="outline" className="h-11 px-4 shrink-0 bg-white" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add login
        </Button>
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
                  <p className="text-sm text-slate-brand">{m.username}</p>
                </div>
                {!isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-slate-brand hover:text-[#B5321A]"
                    aria-label="Remove login"
                    onClick={() => remove.mutate(m.id)}
                    disabled={remove.isPending}
                  >
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
            <DialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">Add a login</DialogTitle>
            <DialogDescription>
              They get their own sign-in for this outlet. Only do this for someone who needs to manage the account.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
            <div className="grid grid-cols-2 gap-3">
              <Field id="fn" label="First name"><Input id="fn" className={INPUT} value={form.firstName} onChange={set("firstName")} /></Field>
              <Field id="sn" label="Surname"><Input id="sn" className={INPUT} value={form.surname} onChange={set("surname")} /></Field>
            </div>
            <Field id="un" label="Username"><Input id="un" className={INPUT} value={form.username} onChange={set("username")} autoComplete="off" /></Field>
            <Field id="em" label="Email"><Input id="em" type="email" className={INPUT} value={form.email} onChange={set("email")} autoComplete="off" /></Field>
            <Field id="pw" label="Password (8+ characters)"><Input id="pw" type="password" className={INPUT} value={form.password} onChange={set("password")} autoComplete="new-password" /></Field>
            <Field id="pin" label="Their till PIN (4 digits)">
              <Input id="pin" inputMode="numeric" maxLength={4} className={`${INPUT} max-w-[8rem] tracking-widest`} value={form.staffPin} onChange={set("staffPin")} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="h-12 px-6 bg-white" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="buoy" className="h-12 px-6" disabled={!canSubmit || add.isPending}>
                {add.isPending ? "Adding" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TeamManagement() {
  return (
    <div className="max-w-3xl space-y-3">
      <TillStaff />
      <PortalLogins />
    </div>
  );
}
