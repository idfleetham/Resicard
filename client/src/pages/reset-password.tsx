import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearch } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";
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
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-bold">This link is not valid</AlertTitle>
          <AlertDescription>Open the link from the email we sent you, or request a new one.</AlertDescription>
        </Alert>
        <Button asChild variant="buoy" className="w-full h-12 mt-4 text-base">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      {done ? (
        <div className="space-y-4">
          <div className="bg-sand rounded-xl p-4 flex gap-3">
            <Check className="h-5 w-5 flex-none text-[#1F8A5B]" strokeWidth={2.5} />
            <div>
              <p className="font-bold text-[#1F8A5B]">Password changed</p>
              <p className="text-sm text-sea mt-1">You can log in with your new password now.</p>
            </div>
          </div>
          <Button asChild variant="buoy" className="w-full h-12 text-base">
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
                    <Input type="password" autoComplete="new-password" className="h-12 rounded-xl text-base" {...field} />
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
                    <Input type="password" autoComplete="new-password" className="h-12 rounded-xl text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="buoy" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving" : "Save new password"}
            </Button>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
}
