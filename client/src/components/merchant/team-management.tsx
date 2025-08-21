import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [showPins, setShowPins] = useState(false);

  // Mock data for staff members
  const staffMembers: StaffMember[] = [
    {
      id: "1",
      name: "John Smith",
      email: "john@example.com",
      role: "manager",
      status: "active",
      staffPin: "1234",
      lastActive: "2024-01-15T10:30:00Z",
      invitedAt: "2024-01-01T09:00:00Z",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      role: "staff",
      status: "active",
      staffPin: "5678",
      lastActive: "2024-01-14T16:45:00Z",
      invitedAt: "2024-01-05T14:30:00Z",
    },
    {
      id: "3",
      name: "Mike Wilson",
      email: "mike@example.com",
      role: "staff",
      status: "pending",
      staffPin: "9012",
      lastActive: "",
      invitedAt: "2024-01-10T11:15:00Z",
    },
  ];

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
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Team Management</h2>
            <p className="text-slate-300">Manage staff accounts, roles, and access permissions</p>
          </div>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
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
        <Card variant="surface">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-soft text-sm">Total Staff</p>
                <p className="text-2xl font-semibold text-fg">{staffMembers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardBody>
        </Card>
        <Card variant="surface">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-soft text-sm">Active</p>
                <p className="text-2xl font-semibold text-fg">{staffMembers.filter(m => m.status === "active").length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardBody>
        </Card>
        <Card variant="surface">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-soft text-sm">Pending</p>
                <p className="text-2xl font-semibold text-fg">{staffMembers.filter(m => m.status === "pending").length}</p>
              </div>
              <UserX className="h-8 w-8 text-orange-500" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Staff Table */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>Manage your team's access and permissions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPins(!showPins)}
              className="border-dim hover:bg-surface/50"
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
                <TableHead className="text-fg">Name</TableHead>
                <TableHead className="text-fg">Email</TableHead>
                <TableHead className="text-fg">Role</TableHead>
                <TableHead className="text-fg">Status</TableHead>
                <TableHead className="text-fg">PIN</TableHead>
                <TableHead className="text-fg">Last Active</TableHead>
                <TableHead className="text-right text-fg">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-fg">{member.name}</TableCell>
                  <TableCell className="text-soft">{member.email}</TableCell>
                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell className="text-soft font-mono">
                    {showPins ? member.staffPin : "••••"}
                  </TableCell>
                  <TableCell className="text-soft">
                    {member.lastActive 
                      ? new Date(member.lastActive).toLocaleDateString()
                      : "Never"
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" className="border-dim hover:bg-surface/50">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="border-dim hover:bg-surface/50">
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
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Staff PIN Security</CardTitle>
          <CardDescription>
            Staff PINs are used for voucher redemption verification
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Key className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-fg">PIN Requirements</h4>
                <p className="text-xs text-soft mt-1">
                  All staff members are assigned a unique 4-digit PIN for voucher redemption.
                  PINs can be rotated for security purposes.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-fg">Security Best Practices</h4>
                <p className="text-xs text-soft mt-1">
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