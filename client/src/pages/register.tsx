import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/resident/auth-layout";
import { MerchantRegisterForm, ResidentRegisterForm } from "@/components/resident/register-forms";
import { errorMessage } from "@/components/resident/format";

const TAB_TRIGGER =
  "h-10 rounded-full text-[15px] font-bold text-sea data-[state=active]:bg-sea data-[state=active]:text-foam data-[state=active]:shadow-none";

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const params = new URLSearchParams(useSearch());
  const role = params.get("role");
  // A shared referral link arrives as ?ref=CODE, so the code is already filled in.
  const referralCode = params.get("ref") ?? undefined;
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
        <TabsList className="grid grid-cols-2 w-full h-12 p-1 mb-5 rounded-full bg-foam">
          <TabsTrigger value="resident" className={TAB_TRIGGER}>Resident</TabsTrigger>
          <TabsTrigger value="merchant" className={TAB_TRIGGER}>Business</TabsTrigger>
        </TabsList>
        <TabsContent value="resident">
          <ResidentRegisterForm onSubmit={submit} referralCode={referralCode} />
        </TabsContent>
        <TabsContent value="merchant">
          <MerchantRegisterForm onSubmit={submit} />
        </TabsContent>
      </Tabs>
      <p className="mt-6 text-sm text-slate-brand text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-sea font-semibold underline underline-offset-[3px]">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
