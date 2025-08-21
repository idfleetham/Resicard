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

  const rotateStaffPinMutation = useMutation({
    mutationFn: (staffId: string) =>
      apiRequest("POST", `/api/staff/${staffId}/rotate-pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff PIN rotated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error rotating PIN",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeStaffMutation = useMutation({
    mutationFn: (staffId: string) =>
      apiRequest("DELETE", `/api/staff/${staffId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member removed successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<InviteStaffData>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "staff",
    },
  });

  const onSubmit = (data: InviteStaffData) => {
    inviteStaffMutation.mutate(data);
  };

  const handleRotatePin = (staffId: string) => {
    rotateStaffPinMutation.mutate(staffId);
  };

  const handleRemoveStaff = (staffId: string) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      removeStaffMutation.mutate(staffId);
    }
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

  const getActiveCount = () => staffMembers.filter(member => member.status === "active").length;
  const getPendingCount = () => staffMembers.filter(member => member.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600">Manage staff accounts, roles, and access permissions</p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
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
                        <Input type="email" placeholder="john@example.com" {...field} />
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
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="staff">Staff - Can process redemptions</SelectItem>
                          <SelectItem value="manager">Manager - Full access</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsInviteOpen(false)}
                  >
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">{staffMembers.length}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">{getActiveCount()}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">{getPendingCount()}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">
              {staffMembers.filter(member => member.role === "manager").length}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Staff Members</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPins(!showPins)}
              >
                {showPins ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide PINs
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show PINs
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage your team members and their access permissions
          </CardDescription>
        </CardHeader>
        <CardBody>
          {staffMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">No staff members yet</p>
              <Button onClick={() => setIsInviteOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Invite Your First Staff Member
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Staff PIN</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {showPins ? member.staffPin : "****"}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotatePin(member.id)}
                          disabled={rotateStaffPinMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.lastActive 
                        ? new Date(member.lastActive).toLocaleDateString()
                        : "Never"
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveStaff(member.id)}
                          disabled={removeStaffMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding what each role can do
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-5 h-5 text-blue-500" />
                <h4 className="font-medium">Manager</h4>
                <Badge variant="default">Full Access</Badge>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Create and manage offers</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Process redemptions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4" />
                  <span>View billing and reports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Manage staff members</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Access all settings</span>
                </li>
              </ul>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Key className="w-5 h-5 text-green-500" />
                <h4 className="font-medium">Staff</h4>
                <Badge variant="outline">Limited Access</Badge>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Process redemptions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4" />
                  <span>View active offers</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserX className="w-4 h-4" />
                  <span>Cannot create offers</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserX className="w-4 h-4" />
                  <span>Cannot view billing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserX className="w-4 h-4" />
                  <span>Cannot manage staff</span>
                </li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}