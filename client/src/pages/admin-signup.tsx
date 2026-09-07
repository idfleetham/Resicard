import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { authApi, type AuthResponse } from "@/lib/auth";
import AuthLayout from "@/components/resident/auth-layout";
import { errorMessage } from "@/components/resident/format";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  surname: z.string().min(1, "Required"),
  username: z.string().min(3, "At least 3 characters").max(30),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "At least 8 characters"),
  setupSecret: z.string().min(1, "Required"),
});
type Values = z.infer<typeof schema>;

const FIELDS: { name: keyof Values; label: string; type?: string; autoComplete?: string }[] = [
  { name: "firstName", label: "First name", autoComplete: "given-name" },
  { name: "surname", label: "Surname", autoComplete: "family-name" },
  { name: "username", label: "Username", autoComplete: "username" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  { name: "setupSecret", label: "Setup secret", type: "password", autoComplete: "off" },
];

export default function AdminSignup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", surname: "", username: "", email: "", password: "", setupSecret: "" },
  });

  const onSubmit = async (values: Values) => {
    try {
      const res = await apiRequest("POST", "/api/auth/register-admin", values);
      const data = (await res.json()) as AuthResponse;
      authApi.setToken(data.token);
      queryClient.setQueryData(["/api/auth/me"], data.user);
      setLocation("/admin");
    } catch (err) {
      toast({ title: "Could not create the admin account", description: errorMessage(err), variant: "destructive" });
    }
  };

  return (
    <AuthLayout title="Create admin account" subtitle="Requires the setup secret configured on the server.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {FIELDS.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.label}</FormLabel>
                  <FormControl>
                    <Input type={f.type ?? "text"} autoComplete={f.autoComplete} className="h-12 rounded-xl text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button type="submit" variant="buoy" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating" : "Create account"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
