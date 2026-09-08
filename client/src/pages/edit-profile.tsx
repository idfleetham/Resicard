import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { updateProfileSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth, useRequireRole } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { homePathForRole } from "@/lib/auth";
import AuthLayout from "@/components/resident/auth-layout";
import PhotoPicker from "@/components/resident/photo-picker";
import DemographicFields from "@/components/resident/demographic-fields";
import { errorMessage } from "@/components/resident/format";

const schema = updateProfileSchema.extend({
  firstName: z.string().min(1, "Enter your first name"),
  surname: z.string().min(1, "Enter your surname"),
  addressLine1: z.string().trim().min(3, "Enter your address").max(80).optional(),
  addressLine2: z.string().trim().max(80).optional().nullable(),
  town: z.string().trim().min(2, "Enter your town").max(40).optional(),
});
type Values = z.infer<typeof schema>;

const ADDRESS_FIELDS: { name: "addressLine1" | "addressLine2" | "town" | "postcode"; label: string; autoComplete: string }[] = [
  { name: "addressLine1", label: "Address line 1", autoComplete: "address-line1" },
  { name: "addressLine2", label: "Address line 2 (optional)", autoComplete: "address-line2" },
  { name: "town", label: "Town", autoComplete: "address-level2" },
  { name: "postcode", label: "Postcode", autoComplete: "postal-code" },
];

export default function EditProfile() {
  const { ready, user } = useRequireRole();
  const { refresh } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const isResident = user?.role === "resident";

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", surname: "", profilePhoto: undefined, ageBand: null, sex: null },
  });

  useEffect(() => {
    if (!user) return;
    const resident = user.role === "resident";
    form.reset({
      firstName: user.firstName ?? "",
      surname: user.surname ?? "",
      addressLine1: resident ? user.addressLine1 ?? "" : undefined,
      addressLine2: resident ? user.addressLine2 ?? "" : undefined,
      town: resident ? user.town ?? "St Andrews" : undefined,
      postcode: resident ? user.postcode ?? "" : undefined,
      profilePhoto: user.profilePhoto ?? undefined,
      ageBand: resident ? user.ageBand ?? null : null,
      sex: resident ? user.sex ?? null : null,
    });
  }, [user, form]);

  const onSubmit = async (values: Values) => {
    try {
      const body: Values = { firstName: values.firstName, surname: values.surname, profilePhoto: values.profilePhoto };
      if (isResident) {
        if (values.postcode) body.postcode = values.postcode;
        if (values.addressLine1) body.addressLine1 = values.addressLine1;
        body.addressLine2 = values.addressLine2?.trim() ? values.addressLine2 : null;
        if (values.town) body.town = values.town;
        // Sent even when null, so a resident can take an answer back.
        body.ageBand = values.ageBand ?? null;
        body.sex = values.sex ?? null;
      }
      const res = await apiRequest("PUT", "/api/profile", body);
      queryClient.setQueryData(["/api/auth/me"], { ...user, ...(await res.json()) });
      await refresh();
      toast({ title: "Profile saved" });
      setLocation(homePathForRole(user?.role));
    } catch (err) {
      toast({ title: "Could not save", description: errorMessage(err), variant: "destructive" });
    }
  };

  if (!ready || !user) return <div className="min-h-screen bg-foam" />;

  return (
    <AuthLayout title="Your profile" subtitle={user.email}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="profilePhoto"
            render={({ field }) => (
              <FormItem>
                <PhotoPicker value={field.value} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" className="h-12 rounded-xl text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="surname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Surname</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" className="h-12 rounded-xl text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {isResident && (
            <div className="border-t border-[#E6E9E8] pt-4 space-y-4">
              <p className="text-sm font-semibold text-sea">Your address</p>
              {ADDRESS_FIELDS.map((f) => (
                <FormField
                  key={f.name}
                  control={form.control}
                  name={f.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{f.label}</FormLabel>
                      <FormControl>
                        <Input autoComplete={f.autoComplete} className="h-12 rounded-xl text-base" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <p className="text-xs text-slate-brand">Changing your address means verifying again.</p>
            </div>
          )}
          {isResident && (
            <DemographicFields
              control={form.control}
              ageBandName="ageBand"
              sexName="sex"
              intro="Outlets see these only as anonymous totals, never against your name. You can leave them blank or change them whenever you like."
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setLocation(homePathForRole(user.role))}>
              Cancel
            </Button>
            <Button type="submit" variant="buoy" className="h-12 flex-1 text-base" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving" : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
