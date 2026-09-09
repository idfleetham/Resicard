import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MERCHANT_CATEGORIES, type Merchant } from "@shared/schema";
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
import { LocationPicker } from "./location-picker";
import { INPUT, SectionTitle } from "./portal-ui";

const LABEL = "text-xs text-slate-brand";

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
  latitude: string;
  longitude: string;
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
    latitude: m.latitude ?? "",
    longitude: m.longitude ?? "",
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
          latitude: f.latitude.trim() === "" ? null : f.latitude,
          longitude: f.longitude.trim() === "" ? null : f.longitude,
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
    return <div className="h-64 bg-white rounded-2xl border border-hairline animate-pulse" />;
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });
  const text = (k: keyof Omit<FormState, "hours">) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value);

  return (
    <form
      className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start"
      onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}
    >
      <div className="bg-white rounded-2xl border border-hairline p-5 space-y-4">
        <SectionTitle>Business details</SectionTitle>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-sand overflow-hidden flex items-center justify-center shrink-0">
            {merchant.logoUrl ? <img src={merchant.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-sea">No logo</span>}
          </div>
          <div>
            <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo.mutate(f); }} />
            <Button type="button" variant="outline" className="h-11 px-4 bg-white" onClick={() => logoInput.current?.click()} disabled={uploadLogo.isPending}>
              {uploadLogo.isPending ? "Uploading" : "Change logo"}
            </Button>
          </div>
        </div>
        <div className="space-y-1"><Label htmlFor="name" className={LABEL}>Name</Label><Input id="name" className={INPUT} value={form.name} onChange={text("name")} required /></div>
        <div className="space-y-1">
          <Label className={LABEL}>Category</Label>
          <Select value={form.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger className={INPUT}><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>
              {MERCHANT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label htmlFor="address" className={LABEL}>Address</Label><Input id="address" className={INPUT} value={form.address} onChange={text("address")} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label htmlFor="phone" className={LABEL}>Phone</Label><Input id="phone" type="tel" className={INPUT} value={form.phone} onChange={text("phone")} /></div>
          <div className="space-y-1"><Label htmlFor="email" className={LABEL}>Email</Label><Input id="email" type="email" className={INPUT} value={form.email} onChange={text("email")} /></div>
        </div>
        <div className="space-y-1">
          <Label className={LABEL}>Online booking</Label>
          <Select value={form.reservationProvider} onValueChange={(v) => set("reservationProvider", v)}>
            <SelectTrigger className={INPUT}><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESERVATION_PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {form.reservationProvider !== "none" && (
          <div className="space-y-1"><Label htmlFor="rurl" className={LABEL}>Booking link</Label><Input id="rurl" type="url" placeholder="https://" className={INPUT} value={form.reservationUrl} onChange={text("reservationUrl")} /></div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-hairline p-5 space-y-4">
        <SectionTitle>Where you are</SectionTitle>
        <p className="text-xs text-[#0F3B47]/70">
          Your pin on the residents' map. Leave it off and you are still listed, just under the map rather than on it.
        </p>
        <LocationPicker
          value={{ latitude: form.latitude, longitude: form.longitude }}
          onChange={(next) => setForm({ ...form, ...next })}
        />
      </div>

      <div className="bg-white rounded-2xl border border-hairline p-5 space-y-4">
        <SectionTitle>Opening hours</SectionTitle>
        <BusinessHoursEditor value={form.hours} onChange={(hours) => set("hours", hours)} />
        <Button type="submit" variant="buoy" className="h-12 w-full" disabled={save.isPending}>{save.isPending ? "Saving" : "Save"}</Button>
      </div>
    </form>
  );
}
