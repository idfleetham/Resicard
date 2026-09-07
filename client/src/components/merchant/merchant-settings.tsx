import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MERCHANT_CATEGORIES, type Merchant } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { uploadMerchantFile } from "@/hooks/use-merchant-offers";
import { categoryLabel, errorMessage } from "@/components/resident/format";
import { BusinessHoursEditor, parseBusinessHours, serialiseBusinessHours, type BusinessHours } from "./business-hours-editor";

const RESERVATION_PROVIDERS = [
  { value: "none", label: "No online booking" },
  { value: "opentable", label: "OpenTable" },
  { value: "resdiary", label: "ResDiary" },
  { value: "sevenrooms", label: "SevenRooms" },
  { value: "quandoo", label: "Quandoo" },
  { value: "website", label: "Our own website" },
  { value: "other", label: "Other" },
];

interface FormState {
  name: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  reservationProvider: string;
  reservationUrl: string;
  hours: BusinessHours;
}

function fromMerchant(m: Merchant): FormState {
  return {
    name: m.name,
    category: m.category ?? "",
    address: m.address ?? "",
    phone: m.phone ?? "",
    email: m.email ?? "",
    reservationProvider: m.reservationProvider ?? "none",
    reservationUrl: m.reservationUrl ?? "",
    hours: parseBusinessHours(m.businessHours),
  };
}

export default function MerchantSettings() {
  const { toast } = useToast();
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const logoInput = useRef<HTMLInputElement>(null);
  const { data: merchant } = useQuery<Merchant>({ queryKey: ["/api/merchant"] });
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (merchant && !form) setForm(fromMerchant(merchant));
  }, [merchant, form]);

  const save = useMutation({
    mutationFn: async (f: FormState) =>
      (
        await apiRequest("PUT", "/api/merchant", {
          name: f.name,
          category: f.category || undefined,
          address: f.address || null,
          phone: f.phone || null,
          email: f.email || null,
          reservationProvider: f.reservationProvider === "none" ? null : f.reservationProvider,
          reservationUrl: f.reservationProvider === "none" ? "" : f.reservationUrl,
          businessHours: serialiseBusinessHours(f.hours),
        })
      ).json() as Promise<Merchant>,
    onSuccess: async (m) => {
      queryClient.setQueryData(["/api/merchant"], m);
      await refresh();
      toast({ title: "Settings saved" });
    },
    onError: (err) => toast({ title: "Could not save", description: errorMessage(err), variant: "destructive" }),
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => (await uploadMerchantFile("/api/merchant/logo", "logo", file)).json() as Promise<{ logoUrl: string }>,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/merchant"] });
      await refresh();
      toast({ title: "Logo updated" });
    },
    onError: (err) => toast({ title: "Logo upload failed", description: errorMessage(err), variant: "destructive" }),
  });

  if (!form || !merchant) {
    return <Card><CardContent className="p-6 animate-pulse h-64 bg-slate-100 rounded-xl" /></Card>;
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });
  const text = (k: keyof Omit<FormState, "hours">) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value);

  return (
    <form
      className="grid grid-cols-1 lg:grid-cols-2 gap-5"
      onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}
    >
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Business details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {merchant.logoUrl ? <img src={merchant.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">No logo</span>}
            </div>
            <div>
              <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo.mutate(f); }} />
              <Button type="button" variant="outline" className="h-11" onClick={() => logoInput.current?.click()} disabled={uploadLogo.isPending}>
                {uploadLogo.isPending ? "Uploading" : "Change logo"}
              </Button>
            </div>
          </div>
          <div><Label htmlFor="name">Name</Label><Input id="name" className="h-11" value={form.name} onChange={text("name")} required /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                {MERCHANT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="address">Address</Label><Input id="address" className="h-11" value={form.address} onChange={text("address")} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" className="h-11" value={form.phone} onChange={text("phone")} /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" className="h-11" value={form.email} onChange={text("email")} /></div>
          </div>
          <div>
            <Label>Online booking</Label>
            <Select value={form.reservationProvider} onValueChange={(v) => set("reservationProvider", v)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESERVATION_PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.reservationProvider !== "none" && (
            <div><Label htmlFor="rurl">Booking link</Label><Input id="rurl" type="url" placeholder="https://" className="h-11" value={form.reservationUrl} onChange={text("reservationUrl")} /></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Opening hours</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <BusinessHoursEditor value={form.hours} onChange={(hours) => set("hours", hours)} />
          <Button type="submit" className="h-12 w-full" disabled={save.isPending}>{save.isPending ? "Saving" : "Save settings"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}
