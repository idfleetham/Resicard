import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearch } from "wouter";
import { loginSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/resident/auth-layout";
import { errorMessage } from "@/components/resident/format";

type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const returnTo = new URLSearchParams(search).get("returnTo") ?? undefined;

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      await login(values.email.trim(), values.password, returnTo);
    } catch (err) {
      toast({ title: "Could not log in", description: errorMessage(err, "Check your email and password."), variant: "destructive" });
    }
  };

  return (
    <AuthLayout title="Log in" subtitle="Use the email address you signed up with.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" inputMode="email" className="h-12 text-base" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" className="h-12 text-base" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Logging in" : "Log in"}
          </Button>
        </form>
      </Form>
      <div className="mt-6 text-sm text-slate-600 space-y-2">
        <p>
          <Link href="/forgot-password" className="text-blue-700 font-medium hover:underline">
            Forgotten your password?
          </Link>
        </p>
        <p>
          New to Resicard?{" "}
          <Link href="/register" className="text-blue-700 font-medium hover:underline">
            Join now
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
