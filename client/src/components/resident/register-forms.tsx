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
            <Input type={type} autoComplete={autoComplete} placeholder={placeholder} className="h-12 text-base" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function AccountFields<T extends ResidentValues | MerchantValues>({ control }: { control: Control<T> }) {
  const c = control as unknown as Control<ResidentValues>;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <TextField control={c} name="firstName" label="First name" autoComplete="given-name" />
        <TextField control={c} name="surname" label="Surname" autoComplete="family-name" />
      </div>
      <TextField control={c} name="username" label="Username" autoComplete="username" placeholder="3 to 30 characters" />
      <TextField control={c} name="email" label="Email" type="email" autoComplete="email" />
      <TextField control={c} name="password" label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" />
    </>
  );
}

interface FormProps<T> {
  onSubmit: (values: T) => Promise<void>;
}

export function ResidentRegisterForm({ onSubmit }: FormProps<ResidentValues>) {
  const form = useForm<ResidentValues>({
    resolver: zodResolver(registerResidentSchema),
    defaultValues: { role: "resident", firstName: "", surname: "", username: "", email: "", password: "", postcode: "", profilePhoto: undefined },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <AccountFields control={form.control} />
        <TextField control={form.control} name="postcode" label="Postcode" autoComplete="postal-code" placeholder="e.g. KY16 9AA" />
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
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
          Next: upload a proof of your St Andrews address, then pay the annual membership. You can browse offers straight away.
        </p>
        <Button type="submit" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating your account" : "Join Resicard"}
        </Button>
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
        <AccountFields control={form.control} />
        <div className="border-t border-slate-200 pt-4 space-y-4">
          <TextField control={form.control} name="businessName" label="Business name" autoComplete="organization" />
          <FormField
            control={form.control}
            name="businessCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base">
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
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
          Next: Resicard reviews your application. Once approved you can add offers and print your scan code. The first months are free.
        </p>
        <Button type="submit" className="w-full h-12 text-base" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Sending application" : "Apply to join"}
        </Button>
      </form>
    </Form>
  );
}
