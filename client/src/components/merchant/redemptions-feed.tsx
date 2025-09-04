import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Download, Filter, RefreshCw, Eye, Calendar, TrendingUp, DollarSign, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Redemption } from "@shared/schema";

export default function RedemptionsFeed() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("7days");
  const [selectedRedemption, setSelectedRedemption] = useState<any>(null);

  const { data: redemptionsResponse, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/redemptions/merchant", user?.id, filter, dateRange],
    queryFn: async () => {
      console.log('RedemptionsFeed: Fetching redemptions for merchant:', user?.id);
      const response = await apiRequest('GET', `/api/redemptions/merchant/${user?.id}`);
      const data = await response.json();
      console.log('RedemptionsFeed: API Response:', data);
      return data;
    },
    enabled: !!user?.id,
  });

  // Handle the response structure - it could be an array or an object with rows
  const redemptions = Array.isArray(redemptionsResponse) 
    ? redemptionsResponse 
    : redemptionsResponse?.rows || [];

  // Debug logging
  console.log('RedemptionsFeed: redemptions array length:', redemptions.length);
  if (redemptions.length > 0) {
    console.log('RedemptionsFeed: First redemption:', redemptions[0]);
  }

  const filteredRedemptions = redemptions.filter((redemption: any) =>
    redemption.dealTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redemption.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const csvData = filteredRedemptions.map((redemption: any) => ({
      Date: format(parseISO(redemption.redeemedAt), "yyyy-MM-dd HH:mm:ss"),
      Deal: redemption.dealTitle,
      Customer: redemption.customerName || "Guest",
      "Offer Value": `£${redemption.offerValue || redemption.calculatedDiscount || redemption.value}`,
      "Original Price": `£${redemption.originalValue || redemption.basketSubtotal || "N/A"}`,
      Staff: redemption.staffName || "System",
    }));

    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(csvData[0] || {}).join(",") + "\n" +
      csvData.map((row: any) => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `redemptions-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (redemption: any) => {
    return (
      <Badge className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2 py-0.5 text-base text-emerald-300 shadow-[inset_0_-1px_0_rgba(255,255,255,.08)]">
        Completed
      </Badge>
    );
  };

  const getTotalValue = () => {
    return filteredRedemptions.reduce((sum: number, redemption: any) => 
      sum + parseFloat(redemption.offerValue || redemption.calculatedDiscount || redemption.value || 0), 0
    ).toFixed(2);
  };

  const getTotalRedemptions = () => filteredRedemptions.length;

  const RedemptionDetailsModal = ({ redemption }: { redemption: any }) => (
    <Dialog open={!!selectedRedemption} onOpenChange={() => setSelectedRedemption(null)}>
      <DialogContent className="bg-surface border border-white/40 shadow-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-fg flex items-center justify-between">
            Redemption Details
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedRedemption(null)}
              className="h-6 w-6 p-0 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        {redemption && (
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="bg-surface2/50 rounded-lg p-4 border border-white/20">
              <h3 className="text-sm font-medium text-white mb-2">Customer</h3>
              <p className="text-fg">{redemption.customerName || "Guest"}</p>
            </div>

            {/* Deal Info */}
            <div className="bg-surface2/50 rounded-lg p-4 border border-white/20">
              <h3 className="text-sm font-medium text-white mb-2">Deal</h3>
              <p className="text-fg">{redemption.dealTitle || redemption.offerTitle || "Unknown Deal"}</p>
            </div>

            {/* Transaction Details */}
            <div className="bg-surface2/50 rounded-lg p-4 border border-white/20">
              <h3 className="text-sm font-medium text-white mb-2">Transaction</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white">Offer Value:</span>
                  <span className="text-green-400 font-medium">£{redemption.offerValue || redemption.calculatedDiscount || redemption.value || "0.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">Original Price:</span>
                  <span className="text-fg">£{redemption.originalValue || redemption.basketSubtotal || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">Date:</span>
                  <span className="text-fg">{format(parseISO(redemption.redeemedAt || redemption.createdAt), "MMM d, yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">Processed by:</span>
                  <span className="text-fg">{redemption.staffName || "System"}</span>
                </div>
              </div>
            </div>

            {/* Voucher Info */}
            <div className="bg-surface2/50 rounded-lg p-4 border border-white/20">
              <h3 className="text-sm font-medium text-white mb-2">Voucher</h3>
              <p className="text-fg font-mono text-xs">{redemption.voucher_code || "N/A"}</p>
            </div>

            {/* Status */}
            <div className="flex justify-center pt-2">
              {getStatusBadge(redemption)}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand1/60 via-brand2/60 to-transparent border border-white/40 shadow-xl shadow-white/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">Redemptions</h1>
          </div>
          <Button 
            onClick={handleExportCSV}
            className="bg-gradient-to-r from-brand1 to-brand2 text-white shadow-elev-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
        <div className="bg-card border border-white/40 shadow-xl shadow-white/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-white">Total Redemptions</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-green-500/70 to-green-600/70 text-white shadow-elev-1">
              📈
            </span>
          </div>
          <div className="mt-3 text-3xl font-semibold text-fg">{getTotalRedemptions()}</div>
        </div>
        
        <div className="bg-card border border-white/40 shadow-xl shadow-white/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-white">Total Value</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70 text-white shadow-elev-1">
              £
            </span>
          </div>
          <div className="mt-3 text-3xl font-semibold text-fg">£{getTotalValue()}</div>
        </div>
        
        <div className="bg-card border border-white/40 shadow-xl shadow-white/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-white">This Period</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-purple-500/70 to-purple-600/70 text-white shadow-elev-1">
              📅
            </span>
          </div>
          <div className="mt-3 text-3xl font-semibold text-fg">{filteredRedemptions.length}</div>
        </div>
      </div>



      {/* Filters */}
      <div className="bg-card border border-white/40 shadow-xl shadow-white/20 rounded-2xl">
        <div className="p-5">
          <h2 className="text-xl text-fg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-lg font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search deals or customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-lg font-medium mb-2 block">Status</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="text-black text-lg">
                  <SelectValue className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all" className="text-black text-lg">All Redemptions</SelectItem>
                  <SelectItem value="completed" className="text-black text-lg">Completed</SelectItem>
                  <SelectItem value="pending" className="text-black text-lg">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-lg font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="text-black text-lg">
                  <SelectValue className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="7days" className="text-black text-lg">Last 7 days</SelectItem>
                  <SelectItem value="30days" className="text-black text-lg">Last 30 days</SelectItem>
                  <SelectItem value="90days" className="text-black text-lg">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setFilter("all");
                setDateRange("7days");
              }}>
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Redemptions Table */}
      <div className="bg-card border border-white/40 shadow-xl shadow-white/20 rounded-2xl">
        <div className="p-5">
          <h2 className="text-xl text-fg font-semibold mb-4">Recent Redemptions</h2>
          {filteredRedemptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white mb-4">No redemptions found</p>
              <p className="text-base text-whiteer">
                {redemptions.length === 0 
                  ? "No customer has redeemed your offers yet"
                  : "Try adjusting your filters to see more redemptions"
                }
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-surface/80 border border-white/40 shadow-xl shadow-white/20 shadow-elev-1 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface2/70 sticky top-0 border-b border-white/5">
                    <TableHead className="text-white">Date & Time</TableHead>
                    <TableHead className="text-white">Deal</TableHead>
                    <TableHead className="text-white">Customer</TableHead>
                    <TableHead className="text-white">Offer Value</TableHead>
                    <TableHead className="text-white">Original Price</TableHead>
                    <TableHead className="text-white">Staff</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5">
                  {filteredRedemptions.map((redemption: any) => (
                    <TableRow key={redemption.id} className="hover:bg-white/[0.03]">
                      <TableCell className="text-white">
                        {format(parseISO(redemption.redeemedAt || redemption.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium text-fg">
                        {redemption.dealTitle || redemption.offerTitle || "Unknown Deal"}
                      </TableCell>
                      <TableCell className="text-white">{redemption.customerName || "Guest"}</TableCell>
                      <TableCell className="text-green-400 font-medium">
                        £{redemption.offerValue || redemption.calculatedDiscount || redemption.value || "0.00"}
                      </TableCell>
                      <TableCell className="text-white">
                        £{redemption.originalValue || redemption.basketSubtotal || "N/A"}
                      </TableCell>
                      <TableCell className="text-white">{redemption.staffName || "System"}</TableCell>
                      <TableCell>{getStatusBadge(redemption)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-white/40 shadow-xl shadow-white/20 bg-surface hover:bg-white/10 hover:border-white/60"
                          onClick={() => setSelectedRedemption(redemption)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Redemption Details Modal */}
      <RedemptionDetailsModal redemption={selectedRedemption} />
    </div>
  );
}