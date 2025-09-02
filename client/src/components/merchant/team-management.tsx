import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Mail, 
  Shield, 
  RotateCcw, 
  Trash2, 
  Eye, 
  EyeOff, 
  Users,
  UserCheck,
  UserX,
  Key
} from "lucide-react";
import { z } from "zod";

const inviteStaffSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["staff", "manager"], { required_error: "Please select a role" }),
});

type InviteStaffData = z.infer<typeof inviteStaffSchema>;

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "staff" | "manager";
  status: "active" | "pending" | "inactive";
  staffPin: string;
  lastActive: string;
  invitedAt: string;
}

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [showPins, setShowPins] = useState(false);

  // Fetch real staff members from API
  const { data: staffData } = useQuery({
    queryKey: ["/api/staff"],
  });
  
  // Convert API data to expected format and filter only actual staff members (not the merchant owner)
  const staffMembers: StaffMember[] = (staffData || [])
    .filter((member: any) => member.role === 'staff' && member.id !== user?.id)
    .map((member: any) => ({
      id: member.id.toString(),
      name: `${member.first_name || ''} ${member.surname || ''}`.trim() || member.username,
      email: member.email,
      role: member.role,
      status: member.is_verified ? "active" : "pending",
      staffPin: member.staff_pin || "0000",
      lastActive: member.updated_at || member.created_at,
      invitedAt: member.created_at,
    }));

  const form = useForm<InviteStaffData>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "staff",
    },
  });

  const inviteStaffMutation = useMutation({
    mutationFn: (data: InviteStaffData) =>
      apiRequest("POST", "/api/staff/invite", {
        ...data,
        merchantId: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsInviteOpen(false);
      form.reset();
      toast({ title: "Staff invitation sent successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteStaffData) => {
    inviteStaffMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "inactive":
        return <Badge variant="destructive">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "manager":
        return <Badge variant="default">Manager</Badge>;
      case "staff":
        return <Badge variant="outline">Staff</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6 bg-bg min-h-screen p-6">
      {/* Header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand1/25 via-brand2/20 to-transparent border border-white/40 shadow-xl shadow-white/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">Team Management</h1>
            <p className="text-slate-300 text-lg">Manage staff accounts, roles, and access permissions</p>
          </div>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-brand1 to-brand2 text-white shadow-elev-1">
                <Plus className="w-4 h-4 mr-2" />
                Invite Staff
              </Button>
            </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Staff Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a new team member to join your merchant account
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={inviteStaffMutation.isPending}>
                        {inviteStaffMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Staff Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated" className="bg-card border border-white/40 shadow-xl shadow-white/20">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-base">Total Staff</p>
                <p className="text-2xl font-semibold text-fg">{staffMembers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardBody>
        </Card>
        <Card variant="elevated" className="bg-card border border-white/40 shadow-xl shadow-white/20">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-base">Active</p>
                <p className="text-2xl font-semibold text-fg">{staffMembers.filter(m => m.status === "active").length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardBody>
        </Card>
        <Card variant="elevated" className="bg-card border border-white/40 shadow-xl shadow-white/20">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-base">Pending</p>
                <p className="text-2xl font-semibold text-fg">{staffMembers.filter(m => m.status === "pending").length}</p>
              </div>
              <UserX className="h-8 w-8 text-orange-500" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Staff Table */}
      <Card variant="elevated" className="bg-card border border-white/40 shadow-xl shadow-white/20">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription className="text-lg">Manage your team's access and permissions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPins(!showPins)}
              className="border-white/40 shadow-xl shadow-white/20 hover:bg-surface/50 text-black bg-white hover:text-white"
            >
              {showPins ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPins ? "Hide PINs" : "Show PINs"}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-fg text-lg">Name</TableHead>
                <TableHead className="text-fg text-lg">Email</TableHead>
                <TableHead className="text-fg text-lg">Role</TableHead>
                <TableHead className="text-fg text-lg">Status</TableHead>
                <TableHead className="text-fg text-lg">PIN</TableHead>
                <TableHead className="text-fg text-lg">Last Active</TableHead>
                <TableHead className="text-right text-fg text-lg">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-fg text-lg">{member.name}</TableCell>
                  <TableCell className="text-slate-300 text-lg">{member.email}</TableCell>
                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell className="text-slate-300 font-mono text-lg">
                    {showPins ? member.staffPin : "••••"}
                  </TableCell>
                  <TableCell className="text-slate-300 text-lg">
                    {member.lastActive 
                      ? new Date(member.lastActive).toLocaleDateString()
                      : "Never"
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" className="border-white/40 shadow-xl shadow-white/20 hover:bg-surface/50 text-black bg-white hover:text-white">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="border-white/40 shadow-xl shadow-white/20 hover:bg-surface/50 text-black bg-white hover:text-white">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Staff PIN Management */}
      <Card variant="elevated" className="bg-card border border-white/40 shadow-xl shadow-white/20">
        <CardHeader>
          <CardTitle>Staff PIN Security</CardTitle>
          <CardDescription className="text-lg">
            Staff PINs are used for voucher redemption verification
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Key className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-base font-medium text-fg">PIN Requirements</h4>
                <p className="text-base text-slate-300 mt-1">
                  All staff members are assigned a unique 4-digit PIN for voucher redemption.
                  PINs can be rotated for security purposes.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="text-base font-medium text-fg">Security Best Practices</h4>
                <p className="text-base text-slate-300 mt-1">
                  Regularly rotate PINs and ensure staff don't share their access codes.
                  Monitor redemption activity for suspicious patterns.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}