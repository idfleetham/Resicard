import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearch } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/resident/auth-layout";
import { errorMessage } from "@/components/resident/format";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The passwords do not match", path: ["confirm"] });
type Values = z.infer<typeof schema>;

export default function ResetPassword() {
  const { toast } = useToast();
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const [done, setDone] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  const onSubmit = async (values: Values) => {
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, password: values.password });
      setDone(true);
    } catch (err) {
      toast({ title: "Could not reset the password", description: errorMessage(err), variant: "destructive" });
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Reset link missing">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>This link is not valid</AlertTitle>
          <AlertDescription>Open the link from the email we sent you, or request a new one.</AlertDescription>
        </Alert>
        <Button asChild className="w-full h-12 mt-4">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      {done ? (
        <div className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-900">Password changed</AlertTitle>
            <AlertDescription className="text-green-800">You can log in with your new password now.</AlertDescription>
          </Alert>
          <Button asChild className="w-full h-12">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" className="h-12 text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" className="h-12 text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving" : "Save new password"}
            </Button>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
}
