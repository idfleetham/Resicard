import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/resident/auth-layout";
import { errorMessage } from "@/components/resident/format";

const schema = z.object({ email: z.string().email("Enter a valid email address") });
type Values = z.infer<typeof schema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (values: Values) => {
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: values.email.trim() });
      setSentTo(values.email.trim());
    } catch (err) {
      toast({ title: "Could not send the email", description: errorMessage(err), variant: "destructive" });
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We will email you a link to choose a new one.">
      {sentTo ? (
        <div className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-900">Check your inbox</AlertTitle>
            <AlertDescription className="text-green-800">
              If there is an account for {sentTo}, a reset link is on its way. It is valid for one hour.
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full h-12">
            <Link href="/login">Back to log in</Link>
          </Button>
        </div>
      ) : (
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
            <Button type="submit" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending" : "Send reset link"}
            </Button>
            <p className="text-sm text-slate-600 text-center">
              <Link href="/login" className="text-blue-700 font-medium hover:underline">
                Back to log in
              </Link>
            </p>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
}
