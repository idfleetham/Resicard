import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  HourglassIcon as Hourglass, 
  Store, 
  Users, 
  Ticket, 
  CheckCircle, 
  XCircle, 
  Eye,
  Settings,
  Save,
  Search,
  Shield,
  MapPin,
  Mail,
  Phone
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { User } from "@shared/schema";

interface PlatformStats {
  totalUsers: number;
  totalBusinesses: number;
  totalDeals: number;
  totalRedemptions: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("pending");
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessCategory, setBusinessCategory] = useState("all");
  const [selectedResident, setSelectedResident] = useState<User | null>(null);
  const [showResidentModal, setShowResidentModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch platform stats
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await apiRequestWithAuth('GET', '/api/admin/stats');
      return response.json() as Promise<PlatformStats>;
    },
    enabled: !!user && user.role === 'admin',
  });

  // Fetch pending businesses
  const { data: pendingBusinesses = [] } = useQuery({
    queryKey: ['/api/admin/pending-businesses'],
    queryFn: async () => {
      const response = await apiRequestWithAuth('GET', '/api/admin/pending-businesses');
      return response.json() as Promise<User[]>;
    },
    enabled: !!user && user.role === 'admin',
  });

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await apiRequestWithAuth('GET', '/api/admin/users');
      return response.json() as Promise<User[]>;
    },
    enabled: !!user && user.role === 'admin',
  });

  // Fetch pending documents
  const { data: pendingDocuments = [] } = useQuery({
    queryKey: ['/api/admin/pending-documents'],
    queryFn: async () => {
      const response = await apiRequestWithAuth('GET', '/api/admin/pending-documents');
      return response.json() as Promise<User[]>;
    },
    enabled: !!user && user.role === 'admin',
  });

  // Verify business mutation
  const verifyBusinessMutation = useMutation({
    mutationFn: async (businessId: number) => {
      const response = await apiRequestWithAuth('POST', `/api/admin/verify-business/${businessId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Business Verified",
        description: "The business has been successfully verified.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify business",
        variant: "destructive",
      });
    },
  });

  const handleVerifyBusiness = (businessId: number) => {
    verifyBusinessMutation.mutate(businessId);
  };

  // Reject business mutation
  const rejectBusinessMutation = useMutation({
    mutationFn: async (businessId: number) => {
      const response = await apiRequestWithAuth('DELETE', `/api/admin/reject-business/${businessId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Business Rejected",
        description: "The business application has been rejected and removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject business",
        variant: "destructive",
      });
    },
  });

  const handleRejectBusiness = (businessId: number) => {
    if (confirm('Are you sure you want to reject this business application? This action cannot be undone.')) {
      rejectBusinessMutation.mutate(businessId);
    }
  };

  // Document approval mutation
  const approveDocumentMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequestWithAuth('POST', `/api/admin/documents/${userId}/approve`, {});
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve document');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Approved",
        description: "The document has been approved and user verified.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve document",
        variant: "destructive",
      });
    },
  });

  // Document rejection mutation
  const rejectDocumentMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequestWithAuth('POST', `/api/admin/documents/${userId}/reject`, {});
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject document');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Rejected",
        description: "The document has been rejected. User can resubmit.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject document",
        variant: "destructive",
      });
    },
  });

  const handleApproveDocument = (userId: number) => {
    approveDocumentMutation.mutate(userId);
  };

  const handleRejectDocument = (userId: number) => {
    if (confirm('Are you sure you want to reject this document? The user will need to resubmit.')) {
      rejectDocumentMutation.mutate(userId);
    }
  };

  // Filter businesses
  const businesses = allUsers.filter(u => u.role === 'merchant');
  const residents = allUsers.filter(u => u.role === 'resident');
  
  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = !businessSearch || 
      business.businessName?.toLowerCase().includes(businessSearch.toLowerCase()) ||
      business.username.toLowerCase().includes(businessSearch.toLowerCase());
    const matchesCategory = businessCategory === "all" || business.businessCategory === businessCategory;
    return matchesSearch && matchesCategory;
  });

  if (!user || user.role !== 'admin') {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You need administrator privileges to access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Admin Header */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Platform Administration</h1>
                  <p className="text-muted-foreground">Manage businesses, residents, and platform settings</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Platform Revenue</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(stats?.totalRevenue || 0)}
                    </div>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Active Users</div>
                    <div className="text-xl font-bold text-primary">
                      {(stats?.totalUsers || 0) + (stats?.totalBusinesses || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <Hourglass className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Pending Reviews</p>
                    <p className="text-2xl font-bold text-foreground">{pendingBusinesses.length + pendingDocuments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Store className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Active Businesses</p>
                    <p className="text-2xl font-bold text-foreground">
                      {businesses.filter(b => b.isVerified).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Residents</p>
                    <p className="text-2xl font-bold text-foreground">{residents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Ticket className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Active Deals</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalDeals || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Navigation */}
          <Card className="mb-8">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5 bg-transparent h-auto p-0">
                  <TabsTrigger 
                    value="pending" 
                    className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                  >
                    <div className="flex items-center space-x-2">
                      <span>Business Reviews</span>
                      {pendingBusinesses.length > 0 && (
                        <Badge className="bg-amber-100 text-amber-800">{pendingBusinesses.length}</Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documents" 
                    className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                  >
                    <div className="flex items-center space-x-2">
                      <span>Document Reviews</span>
                      {pendingDocuments.length > 0 && (
                        <Badge className="bg-amber-100 text-amber-800">{pendingDocuments.length}</Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="businesses"
                    className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                  >
                    All Businesses
                  </TabsTrigger>
                  <TabsTrigger 
                    value="residents"
                    className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                  >
                    Residents
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings"
                    className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                  >
                    Platform Settings
                  </TabsTrigger>
                </TabsList>

                {/* Pending Reviews Tab */}
                <TabsContent value="pending" className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Business Applications Awaiting Review
                  </h3>
                  {pendingBusinesses.length > 0 ? (
                    <div className="space-y-4">
                      {pendingBusinesses.map((business) => (
                        <div key={business.id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <h4 className="text-lg font-semibold text-foreground">
                                  {business.businessName || business.username}
                                </h4>
                                <Badge className="ml-3 bg-amber-100 text-amber-800">
                                  Pending Review
                                </Badge>
                              </div>
                              <p className="text-muted-foreground mb-2">
                                {business.businessCategory} • {business.username}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                {business.businessAddress && (
                                  <span className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {business.businessAddress}
                                  </span>
                                )}
                                <span className="flex items-center">
                                  <Mail className="h-4 w-4 mr-1" />
                                  {business.email}
                                </span>
                                {business.businessPhone && (
                                  <span className="flex items-center">
                                    <Phone className="h-4 w-4 mr-1" />
                                    {business.businessPhone}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2">
                                <span className="text-sm text-muted-foreground">
                                  Applied: {formatDate(business.createdAt || new Date())}
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Button 
                                size="sm"
                                onClick={() => handleVerifyBusiness(business.id)}
                                disabled={verifyBusinessMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button 
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectBusiness(business.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Hourglass className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No pending applications</h3>
                      <p className="text-muted-foreground">
                        All business applications have been reviewed.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Document Reviews Tab */}
                <TabsContent value="documents" className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Document Verification Reviews
                  </h3>
                  {pendingDocuments.length > 0 ? (
                    <div className="space-y-4">
                      {pendingDocuments.map((resident) => (
                        <div key={resident.id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <h4 className="text-lg font-semibold text-foreground">
                                  {resident.username}
                                </h4>
                                <Badge className="ml-3 bg-blue-100 text-blue-800">
                                  Resident Application
                                </Badge>
                                <Badge className="ml-2 bg-amber-100 text-amber-800">
                                  Document Pending Review
                                </Badge>
                              </div>
                              <p className="text-muted-foreground mb-4">
                                <strong>Email:</strong> {resident.email} • <strong>Postcode:</strong> {resident.postcode || 'Not provided'}
                              </p>
                              
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <h5 className="font-medium text-foreground">Application Details</h5>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="font-medium">Document Type:</span> 
                                      <Badge variant="outline" className="ml-2">
                                        {resident.documentType || 'Not specified'}
                                      </Badge>
                                    </div>
                                    {resident.documentSubmittedAt && (
                                      <div>
                                        <span className="font-medium">Submitted:</span> {formatDate(resident.documentSubmittedAt)}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium">Applying as:</span> Resident (St Andrews local)
                                    </div>
                                  </div>
                                </div>
                                
                                {resident.documentFile && (
                                  <div className="space-y-3">
                                    <h5 className="font-medium text-foreground">Submitted Document</h5>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                                      <img 
                                        src={resident.documentFile} 
                                        alt={`${resident.documentType} submitted by ${resident.username}`}
                                        className="w-full max-w-sm mx-auto object-contain rounded shadow-sm cursor-pointer hover:shadow-lg transition-shadow"
                                        style={{ maxHeight: '300px' }}
                                        onClick={() => resident.documentFile && window.open(resident.documentFile, '_blank')}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<div class="text-center text-red-600 p-4"><p>Document image failed to load</p><p class="text-xs mt-2">File may be corrupted or invalid format</p></div>';
                                          }
                                        }}
                                      />
                                    </div>
                                    <p className="text-xs text-gray-600 text-center">
                                      Click image to view full size
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              {!resident.documentFile && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-red-800 text-sm">
                                    <strong>Warning:</strong> No document file found for this application.
                                  </p>
                                </div>
                              )}
                              
                              {!resident.documentType && (
                                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <p className="text-yellow-800 text-sm">
                                    <strong>Notice:</strong> Document type not specified.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                            <Button 
                              size="default"
                              variant="outline"
                              onClick={() => handleRejectDocument(resident.id)}
                              disabled={rejectDocumentMutation.isPending}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {rejectDocumentMutation.isPending ? 'Rejecting...' : 'Reject Document'}
                            </Button>
                            <Button 
                              size="default"
                              variant="default"
                              onClick={() => handleApproveDocument(resident.id)}
                              disabled={approveDocumentMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {approveDocumentMutation.isPending ? 'Approving...' : 'Approve & Verify'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No pending documents</h3>
                      <p className="text-muted-foreground">
                        All document verifications have been reviewed.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* All Businesses Tab */}
                <TabsContent value="businesses" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">All Registered Businesses</h3>
                    <div className="flex space-x-4">
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          placeholder="Search businesses..." 
                          value={businessSearch}
                          onChange={(e) => setBusinessSearch(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <Select value={businessCategory} onValueChange={setBusinessCategory}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="restaurant">Restaurants</SelectItem>
                          <SelectItem value="bar">Bars</SelectItem>
                          <SelectItem value="cafe">Cafes</SelectItem>
                          <SelectItem value="pub">Pubs</SelectItem>
                          <SelectItem value="takeaway">Takeaway</SelectItem>
                          <SelectItem value="fine-dining">Fine Dining</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Business
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Joined
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                          {filteredBusinesses.map((business) => (
                            <tr key={business.id} className="hover:bg-muted/50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <img 
                                    src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=50&h=50&fit=crop" 
                                    alt="Business" 
                                    className="w-10 h-10 rounded-lg object-cover"
                                  />
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-foreground">
                                      {business.businessName || business.username}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {business.businessAddress || 'No address provided'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={business.businessCategory ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                                  {business.businessCategory || 'Uncategorized'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={getStatusColor(business.isVerified ? 'verified' : 'pending')}>
                                  {business.isVerified ? 'Verified' : 'Pending'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                {formatDate(business.createdAt || new Date())}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                                  View
                                </Button>
                                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700">
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80">
                                  Suspend
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* Residents Tab */}
                <TabsContent value="residents" className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Registered Residents</h3>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Resident
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Postcode
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Verification Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Membership
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Joined
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                          {residents.map((resident) => (
                            <tr key={resident.id} className="hover:bg-muted/50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-foreground">{resident.username}</div>
                                  <div className="text-sm text-muted-foreground">{resident.email}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                {resident.postcode || 'Not provided'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {resident.isResidencyVerified ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                ) : resident.documentStatus === 'pending' ? (
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    <Hourglass className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                ) : resident.documentStatus === 'rejected' ? (
                                  <Badge className="bg-red-100 text-red-800">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rejected
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Not Submitted
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className="bg-green-100 text-green-800">
                                  {resident.membershipExpiry 
                                    ? `Until ${formatDate(resident.membershipExpiry)}`
                                    : 'Active'
                                  }
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                {formatDate(resident.createdAt || new Date())}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-primary hover:text-primary/80"
                                  onClick={() => {
                                    setSelectedResident(resident);
                                    setShowResidentModal(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-amber-600 hover:text-amber-700"
                                  onClick={() => {
                                    setSelectedResident(resident);
                                    setShowResidentModal(true);
                                  }}
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* Platform Settings Tab */}
                <TabsContent value="settings" className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6">Platform Configuration</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-base font-semibold text-foreground mb-4">Location Settings</h4>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="basePostcode" className="text-sm font-medium text-foreground">
                                Base Postcode
                              </Label>
                              <Input 
                                id="basePostcode"
                                defaultValue="KY16 9SS" 
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Center point for radius calculations
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="radiusMiles" className="text-sm font-medium text-foreground">
                                Eligibility Radius (miles)
                              </Label>
                              <Input 
                                id="radiusMiles"
                                type="number" 
                                defaultValue="10" 
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Maximum distance for resident eligibility
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-base font-semibold text-foreground mb-4">Commission Settings</h4>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="commissionRate" className="text-sm font-medium text-foreground">
                                Default Commission Rate (%)
                              </Label>
                              <Input 
                                id="commissionRate"
                                type="number" 
                                step="0.5"
                                defaultValue="12" 
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Applied to all new business deals
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="minDealValue" className="text-sm font-medium text-foreground">
                                Minimum Deal Value (£)
                              </Label>
                              <Input 
                                id="minDealValue"
                                type="number" 
                                defaultValue="5" 
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Minimum value for deal eligibility
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-6">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-base font-semibold text-foreground mb-4">Membership Settings</h4>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="membershipFee" className="text-sm font-medium text-foreground">
                                Annual Membership Fee (£)
                              </Label>
                              <Input 
                                id="membershipFee"
                                type="number" 
                                defaultValue="25" 
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Fee charged to residents annually
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="autoRenewal" defaultChecked />
                              <Label htmlFor="autoRenewal" className="text-sm text-foreground">
                                Enable automatic membership renewal
                              </Label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-base font-semibold text-foreground mb-4">Notification Settings</h4>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="emailNotifications" defaultChecked />
                              <Label htmlFor="emailNotifications" className="text-sm text-foreground">
                                Email notifications for new applications
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="weeklyReports" defaultChecked />
                              <Label htmlFor="weeklyReports" className="text-sm text-foreground">
                                Weekly platform reports
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="fraudAlerts" defaultChecked />
                              <Label htmlFor="fraudAlerts" className="text-sm text-foreground">
                                Fraud detection alerts
                              </Label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button className="coastal-gradient">
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
