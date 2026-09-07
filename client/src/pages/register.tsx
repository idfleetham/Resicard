import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/resident/auth-layout";
import { MerchantRegisterForm, ResidentRegisterForm } from "@/components/resident/register-forms";
import { errorMessage } from "@/components/resident/format";

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const role = new URLSearchParams(useSearch()).get("role");
  const [tab, setTab] = useState(role === "merchant" ? "merchant" : "resident");

  const submit = async (values: Record<string, unknown>) => {
    try {
      await register(values);
    } catch (err) {
      toast({ title: "Could not create the account", description: errorMessage(err), variant: "destructive" });
    }
  };

  return (
    <AuthLayout
      title="Join Resicard"
      subtitle={tab === "merchant" ? "Offer St Andrews residents a fair price." : "For people who live in and around St Andrews."}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 w-full h-12 mb-5">
          <TabsTrigger value="resident" className="h-10 text-base">Resident</TabsTrigger>
          <TabsTrigger value="merchant" className="h-10 text-base">Business</TabsTrigger>
        </TabsList>
        <TabsContent value="resident">
          <ResidentRegisterForm onSubmit={submit} />
        </TabsContent>
        <TabsContent value="merchant">
          <MerchantRegisterForm onSubmit={submit} />
        </TabsContent>
      </Tabs>
      <p className="mt-6 text-sm text-slate-600 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-700 font-medium hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
