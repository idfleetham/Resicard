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
import { errorMessage } from "@/components/resident/format";

const schema = updateProfileSchema.extend({
  firstName: z.string().min(1, "Enter your first name"),
  surname: z.string().min(1, "Enter your surname"),
});
type Values = z.infer<typeof schema>;

export default function EditProfile() {
  const { ready, user } = useRequireRole();
  const { refresh } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const isResident = user?.role === "resident";

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", surname: "", postcode: "", profilePhoto: undefined },
  });

  useEffect(() => {
    if (!user) return;
    form.reset({
      firstName: user.firstName ?? "",
      surname: user.surname ?? "",
      postcode: user.postcode ?? "",
      profilePhoto: user.profilePhoto ?? undefined,
    });
  }, [user, form]);

  const onSubmit = async (values: Values) => {
    try {
      const body: Values = { firstName: values.firstName, surname: values.surname, profilePhoto: values.profilePhoto };
      if (isResident && values.postcode) body.postcode = values.postcode;
      const res = await apiRequest("PUT", "/api/profile", body);
      queryClient.setQueryData(["/api/auth/me"], { ...user, ...(await res.json()) });
      await refresh();
      toast({ title: "Profile saved" });
      setLocation(homePathForRole(user?.role));
    } catch (err) {
      toast({ title: "Could not save", description: errorMessage(err), variant: "destructive" });
    }
  };

  if (!ready || !user) return <div className="min-h-screen bg-slate-50" />;

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
                    <Input autoComplete="given-name" className="h-12 text-base" {...field} />
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
                    <Input autoComplete="family-name" className="h-12 text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {isResident && (
            <FormField
              control={form.control}
              name="postcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postcode</FormLabel>
                  <FormControl>
                    <Input autoComplete="postal-code" className="h-12 text-base" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setLocation(homePathForRole(user.role))}>
              Cancel
            </Button>
            <Button type="submit" className="h-12 flex-1 text-base" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving" : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
