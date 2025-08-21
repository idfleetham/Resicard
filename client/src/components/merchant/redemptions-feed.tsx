import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Download, Filter, RefreshCw, Eye, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Redemption } from "@shared/schema";

export default function RedemptionsFeed() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("7days");

  const { data: redemptions = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/redemptions/merchant", user?.id, filter, dateRange],
    enabled: !!user?.id,
  });

  const filteredRedemptions = redemptions.filter((redemption: any) =>
    redemption.dealTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redemption.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const csvData = filteredRedemptions.map((redemption: any) => ({
      Date: format(parseISO(redemption.redeemedAt), "yyyy-MM-dd HH:mm:ss"),
      Deal: redemption.dealTitle,
      Customer: redemption.customerName || "Guest",
      "Discount Value": `£${redemption.calculatedDiscount || redemption.value}`,
      "Original Price": `£${redemption.basketSubtotal || "N/A"}`,
      Staff: redemption.staffName || "System",
    }));

    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(csvData[0] || {}).join(",") + "\n" +
      csvData.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `redemptions-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (redemption: any) => {
    return <Badge variant="default">Completed</Badge>;
  };

  const getTotalValue = () => {
    return filteredRedemptions.reduce((sum: number, redemption: any) => 
      sum + parseFloat(redemption.calculatedDiscount || redemption.value || 0), 0
    ).toFixed(2);
  };

  const getTotalRedemptions = () => filteredRedemptions.length;

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
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand1/25 via-brand2/20 to-transparent border border-dim p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">Redemptions</h1>
            <p className="text-soft">Track and manage customer voucher redemptions</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/90 border border-dim shadow-elev-1 hover:shadow-elev-2 hover:border-dimStrong transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-soft">Total Redemptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-fg">{getTotalRedemptions()}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/90 border border-dim shadow-elev-1 hover:shadow-elev-2 hover:border-dimStrong transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-soft">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-fg">£{getTotalValue()}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/90 border border-dim shadow-elev-1 hover:shadow-elev-2 hover:border-dimStrong transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-soft">This Period</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-fg">{filteredRedemptions.length}</div>
          </CardContent>
        </Card>
      </div>



      {/* Filters */}
      <Card className="bg-card/90 border border-dim shadow-elev-1">
        <CardHeader className="border-b border-dim">
          <CardTitle className="text-lg text-fg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search deals or customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Redemptions</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
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
        </CardContent>
      </Card>

      {/* Redemptions Table */}
      <Card className="bg-card/90 border border-dim shadow-elev-1 hover:shadow-elev-2 hover:border-dimStrong transition">
        <CardHeader className="border-b border-dim">
          <CardTitle className="text-fg">Recent Redemptions</CardTitle>
          <CardDescription className="text-soft">
            Live feed of customer redemptions for your offers
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          {filteredRedemptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-soft mb-4">No redemptions found</p>
              <p className="text-sm text-softer">
                {redemptions.length === 0 
                  ? "No customer has redeemed your offers yet"
                  : "Try adjusting your filters to see more redemptions"
                }
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-surface/80 border border-dim shadow-elev-1 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface2/70 sticky top-0 border-b border-white/5">
                    <TableHead className="text-soft">Date & Time</TableHead>
                    <TableHead className="text-soft">Deal</TableHead>
                    <TableHead className="text-soft">Customer</TableHead>
                    <TableHead className="text-soft">Discount</TableHead>
                    <TableHead className="text-soft">Original Price</TableHead>
                    <TableHead className="text-soft">Staff</TableHead>
                    <TableHead className="text-soft">Status</TableHead>
                    <TableHead className="text-soft">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5">
                  {filteredRedemptions.map((redemption: any) => (
                    <TableRow key={redemption.id} className="hover:bg-white/[0.03]">
                      <TableCell className="text-soft">
                        {format(parseISO(redemption.redeemedAt || redemption.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium text-fg">
                        {redemption.dealTitle || redemption.offerTitle || "Unknown Deal"}
                      </TableCell>
                      <TableCell className="text-soft">{redemption.customerName || "Guest"}</TableCell>
                      <TableCell className="text-green-400 font-medium">
                        £{redemption.calculatedDiscount || redemption.value || "0.00"}
                      </TableCell>
                      <TableCell className="text-soft">
                        £{redemption.basketSubtotal || "N/A"}
                      </TableCell>
                      <TableCell className="text-soft">{redemption.staffName || "System"}</TableCell>
                      <TableCell>{getStatusBadge(redemption)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="border-dim bg-surface hover:border-dimStrong">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}