import { useState } from "react";
import { useForm, type Control, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MERCHANT_CATEGORIES, registerMerchantSchema, registerResidentSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PhotoPicker from "@/components/resident/photo-picker";
import { categoryLabel } from "@/components/resident/format";
import PostcodeGate, { type PostcodeCheck } from "@/components/resident/postcode-gate";
import { usePricing } from "@/components/pricing/use-pricing";

type ResidentValues = z.infer<typeof registerResidentSchema>;
type MerchantValues = z.infer<typeof registerMerchantSchema>;

interface TextFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}

function TextField<T extends FieldValues>({ control, name, label, type = "text", autoComplete, placeholder }: TextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} autoComplete={autoComplete} placeholder={placeholder} className="h-12 rounded-xl text-base" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Only a merchant picks a username: a business trades under its own name, while a
 * resident's handle is generated so nothing they chose can identify them to an outlet.
 */
function AccountFields<T extends ResidentValues | MerchantValues>({
  control,
  username = false,
}: {
  control: Control<T>;
  username?: boolean;
}) {
  const c = control as unknown as Control<MerchantValues>;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <TextField control={c} name="firstName" label="First name" autoComplete="given-name" />
        <TextField control={c} name="surname" label="Surname" autoComplete="family-name" />
      </div>
      {username && (
        <TextField control={c} name="username" label="Username" autoComplete="username" placeholder="3 to 30 characters" />
      )}
      <TextField control={c} name="email" label="Email" type="email" autoComplete="email" />
      <TextField control={c} name="password" label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" />
    </>
  );
}

interface FormProps<T> {
  onSubmit: (values: T) => Promise<void>;
}

export function ResidentRegisterForm({ onSubmit, referralCode }: FormProps<ResidentValues> & { referralCode?: string }) {
  const { data: pricing } = usePricing();
  const [postcode, setPostcode] = useState("");
  const [check, setCheck] = useState<PostcodeCheck | null>(null);
  const form = useForm<ResidentValues>({
    resolver: zodResolver(registerResidentSchema),
    defaultValues: {
      role: "resident", firstName: "", surname: "", email: "", password: "",
      addressLine1: "", addressLine2: "", town: "St Andrews", postcode: "", profilePhoto: undefined,
      referralCode: referralCode ?? "",
    },
  });

  // The rest of the form only exists once the postcode passes, so the tidied
  // postcode is the one that gets submitted.
  const eligible = Boolean(check?.eligible && check.normalised);
  const handleResult = (result: PostcodeCheck | null) => {
    setCheck(result);
    form.setValue("postcode", result?.eligible && result.normalised ? result.normalised : "");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <PostcodeGate
          value={postcode}
          onChange={setPostcode}
          onResult={handleResult}
          result={check}
          contactEmail={pricing?.contactEmail ?? "hello@resicard.co.uk"}
        />
        {!eligible ? null : (
        <>
        <div className="border-t border-[#E6E9E8] pt-4 space-y-4">
          <AccountFields control={form.control} />
        </div>
        <div className="border-t border-[#E6E9E8] pt-4 space-y-4">
          <TextField control={form.control} name="addressLine1" label="Address line 1" autoComplete="address-line1" placeholder="House number and street" />
          <FormField
            control={form.control}
            name="addressLine2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address line 2 (optional)</FormLabel>
                <FormControl>
                  <Input autoComplete="address-line2" className="h-12 rounded-xl text-base" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <TextField control={form.control} name="town" label="Town" autoComplete="address-level2" />
        </div>
        <FormField
          control={form.control}
          name="profilePhoto"
          render={({ field }) => (
            <FormItem>
              <PhotoPicker value={field.value} onChange={field.onChange} label="Profile photo (optional)" />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="referralCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referral code (optional)</FormLabel>
              <FormControl>
                <Input
                  autoCapitalize="characters"
                  autoComplete="off"
                  placeholder="From a member who told you about Resicard"
                  className="h-12 rounded-xl text-base uppercase"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-sm text-sea bg-sand rounded-xl p-4">
          Next: you choose how to confirm you live here, by post or in person, then you pay the annual membership. You can browse offers straight away.
        </p>
        <Button type="submit" variant="buoy" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating your account" : "Join Resicard"}
        </Button>
        </>
        )}
      </form>
    </Form>
  );
}

export function MerchantRegisterForm({ onSubmit }: FormProps<MerchantValues>) {
  const form = useForm<MerchantValues>({
    resolver: zodResolver(registerMerchantSchema),
    defaultValues: {
      role: "merchant", firstName: "", surname: "", username: "", email: "", password: "",
      businessName: "", businessCategory: undefined, businessAddress: "", businessPhone: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <AccountFields control={form.control} username />
        <div className="border-t border-[#E6E9E8] pt-4 space-y-4">
          <TextField control={form.control} name="businessName" label="Business name" autoComplete="organization" />
          <FormField
            control={form.control}
            name="businessCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12 rounded-xl text-base">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MERCHANT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categoryLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <TextField control={form.control} name="businessAddress" label="Address" autoComplete="street-address" />
          <TextField control={form.control} name="businessPhone" label="Phone" type="tel" autoComplete="tel" />
        </div>
        <p className="text-sm text-sea bg-sand rounded-xl p-4">
          Next: Resicard reviews your application. Once approved you can add offers and print your scan code. Listing is free.
        </p>
        <Button type="submit" variant="buoy" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Sending application" : "Apply to join"}
        </Button>
      </form>
    </Form>
  );
}
