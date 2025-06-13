import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users } from "lucide-react";

const familyMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Surname is required"),
  age: z.number().min(0, "Age must be 0 or greater").max(120, "Age must be realistic"),
  relationship: z.enum(["spouse", "child", "other"], {
    required_error: "Please select a relationship",
  }),
}).refine((data) => {
  if (data.relationship === "child" && data.age > 17) {
    return false;
  }
  return true;
}, {
  message: "Children must be 17 years old or under",
  path: ["age"],
});

const familyMembersFormSchema = z.object({
  familyMembers: z.array(familyMemberSchema).min(1, "At least one family member is required"),
});

type FamilyMembersFormData = z.infer<typeof familyMembersFormSchema>;

interface FamilyMemberFormProps {
  onSubmit: (familyMembers: any[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function FamilyMemberForm({ onSubmit, onCancel, isLoading }: FamilyMemberFormProps) {
  const form = useForm<FamilyMembersFormData>({
    resolver: zodResolver(familyMembersFormSchema),
    defaultValues: {
      familyMembers: [
        { firstName: "", surname: "", age: 0, relationship: "spouse" as const }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "familyMembers",
  });

  const handleSubmit = (data: FamilyMembersFormData) => {
    onSubmit(data.familyMembers);
  };

  const addFamilyMember = () => {
    append({ firstName: "", surname: "", age: 0, relationship: "child" as const });
  };

  const getRelationshipBadgeColor = (relationship: string) => {
    switch (relationship) {
      case "spouse":
        return "bg-blue-100 text-blue-800";
      case "child":
        return "bg-green-100 text-green-800";
      case "other":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Family Members</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add your family members to your subscription. Children must be 17 years old or under.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">
                      Family Member {index + 1}
                      {form.watch(`familyMembers.${index}.relationship`) && (
                        <Badge className={`ml-2 ${getRelationshipBadgeColor(form.watch(`familyMembers.${index}.relationship`))}`}>
                          {form.watch(`familyMembers.${index}.relationship`)}
                        </Badge>
                      )}
                    </h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`familyMembers.${index}.firstName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`familyMembers.${index}.surname`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surname</FormLabel>
                          <FormControl>
                            <Input placeholder="Surname" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`familyMembers.${index}.age`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Age"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`familyMembers.${index}.relationship`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="spouse">Spouse/Partner</SelectItem>
                              <SelectItem value="child">Child (17 or under)</SelectItem>
                              <SelectItem value="other">Other Family Member</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={addFamilyMember}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Family Member</span>
              </Button>

              <div className="text-sm text-muted-foreground">
                {fields.length} family member{fields.length !== 1 ? 's' : ''} added
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating Subscription..." : "Continue with Family Subscription"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}