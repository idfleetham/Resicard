import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Download, Filter, RefreshCw, Eye, Calendar, TrendingUp } from "lucide-react";
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Redemptions Feed</h2>
          <p className="text-gray-600">Track customer redemptions and export reports</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportCSV} disabled={filteredRedemptions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalRedemptions()}</div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange === "7days" ? "7 days" : dateRange === "30days" ? "30 days" : "90 days"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discount Value</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{getTotalValue()}</div>
            <p className="text-xs text-muted-foreground">
              Provided to customers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Per Redemption</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{getTotalRedemptions() > 0 ? (parseFloat(getTotalValue()) / getTotalRedemptions()).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average discount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle>Recent Redemptions</CardTitle>
          <CardDescription>
            Live feed of customer redemptions for your offers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRedemptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No redemptions found</p>
              <p className="text-sm text-gray-400">
                {redemptions.length === 0 
                  ? "No customer has redeemed your offers yet"
                  : "Try adjusting your filters to see more redemptions"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Original Price</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRedemptions.map((redemption: any) => (
                  <TableRow key={redemption.id}>
                    <TableCell>
                      {format(parseISO(redemption.redeemedAt || redemption.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {redemption.dealTitle || redemption.offerTitle || "Unknown Deal"}
                    </TableCell>
                    <TableCell>{redemption.customerName || "Guest"}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      £{redemption.calculatedDiscount || redemption.value || "0.00"}
                    </TableCell>
                    <TableCell>
                      £{redemption.basketSubtotal || "N/A"}
                    </TableCell>
                    <TableCell>{redemption.staffName || "System"}</TableCell>
                    <TableCell>{getStatusBadge(redemption)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}