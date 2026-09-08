import type { Control, FieldValues, Path, PathValue } from "react-hook-form";
import { AGE_BANDS, SEX_OPTIONS } from "@shared/schema";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * The two optional demographic questions, shared by registration and the profile
 * page so they are worded and behave the same in both. Nothing here is required:
 * leaving both alone is a valid answer and costs the resident nothing, which is
 * why the sentence above them says so before either field is read.
 */

/** Sentinel for "no answer", since a select cannot hold an empty value. */
const NONE = "__none";

const SEX_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

interface ChoiceProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly string[];
  optionLabel?: (value: string) => string;
  /** Shown as the last option, for a resident who has answered and wants to take it back. */
  clearLabel: string;
}

function Choice<T extends FieldValues>({ control, name, label, options, optionLabel, clearLabel }: ChoiceProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            value={(field.value as string | null | undefined) ?? NONE}
            onValueChange={(value) => field.onChange((value === NONE ? null : value) as PathValue<T, Path<T>>)}
          >
            <FormControl>
              <SelectTrigger className="h-12 rounded-xl text-base">
                <SelectValue placeholder={clearLabel} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {optionLabel ? optionLabel(option) : option}
                </SelectItem>
              ))}
              <SelectItem value={NONE}>{clearLabel}</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface DemographicFieldsProps<T extends FieldValues> {
  control: Control<T>;
  ageBandName: Path<T>;
  sexName: Path<T>;
  intro: string;
}

export default function DemographicFields<T extends FieldValues>({
  control,
  ageBandName,
  sexName,
  intro,
}: DemographicFieldsProps<T>) {
  return (
    <div className="border-t border-[#E6E9E8] pt-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-sea">About you (optional)</p>
        <p className="text-xs text-[#5C6F75] mt-1 leading-relaxed">{intro}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Choice control={control} name={ageBandName} label="Age" options={AGE_BANDS} clearLabel="Prefer not to say" />
        <Choice
          control={control}
          name={sexName}
          label="Sex"
          options={SEX_OPTIONS}
          optionLabel={(value) => SEX_LABELS[value] ?? value}
          clearLabel="Leave blank"
        />
      </div>
    </div>
  );
}
