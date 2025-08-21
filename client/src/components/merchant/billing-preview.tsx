import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Download, Calendar, CreditCard, TrendingUp, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";

interface BillingPeriod {
  id: string;
  period: string;
  redemptions: number;
  totalFees: number;
  status: 'draft' | 'pending_dd' | 'collected';
  dueDate: string;
}

export default function BillingPreview() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  
  // Mock data for billing periods
  const billingPeriods: BillingPeriod[] = [
    {
      id: "current",
      period: format(new Date(), "MMMM yyyy"),
      redemptions: 47,
      totalFees: 23.50,
      status: "draft",
      dueDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    },
    {
      id: "last",
      period: format(subMonths(new Date(), 1), "MMMM yyyy"),
      redemptions: 82,
      totalFees: 41.00,
      status: "collected",
      dueDate: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
    },
    {
      id: "two_months",
      period: format(subMonths(new Date(), 2), "MMMM yyyy"),
      redemptions: 65,
      totalFees: 32.50,
      status: "collected",
      dueDate: format(endOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd"),
    },
  ];

  const currentPeriod = billingPeriods.find(p => p.id === selectedPeriod) || billingPeriods[0];
  const feePerRedemption = 0.50; // £0.50 per redemption

  const { data: redemptionStats } = useQuery({
    queryKey: ["/api/billing/stats", user?.id, selectedPeriod],
    enabled: !!user?.id,
  });

  const handleDownloadInvoice = (periodId: string) => {
    const period = billingPeriods.find(p => p.id === periodId);
    if (!period) return;

    // Generate CSV content
    const csvData = [
      ["Resicard St Andrews - Invoice"],
      [""],
      ["Business:", user?.businessName || "Unknown Business"],
      ["Period:", period.period],
      ["Invoice Date:", format(new Date(), "yyyy-MM-dd")],
      ["Due Date:", period.dueDate],
      [""],
      ["Description", "Quantity", "Unit Price", "Total"],
      ["Redemption Processing Fee", period.redemptions.toString(), `£${feePerRedemption}`, `£${period.totalFees}`],
      [""],
      ["Total Due:", "", "", `£${period.totalFees}`],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + 
      csvData.map(row => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoice-${period.period.replace(" ", "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "pending_dd":
        return <Badge variant="default">Pending Direct Debit</Badge>;
      case "collected":
        return <Badge variant="destructive">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "pending_dd":
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case "collected":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Billing Preview</h2>
          <p className="text-gray-600">View monthly fees and download invoices</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {billingPeriods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handleDownloadInvoice(selectedPeriod)}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Current Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redemptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">{currentPeriod.redemptions}</div>
            <p className="text-xs text-muted-foreground">{currentPeriod.period}</p>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Per Redemption</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">£{feePerRedemption}</div>
            <p className="text-xs text-muted-foreground">Standard rate</p>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">£{currentPeriod.totalFees}</div>
            <p className="text-xs text-muted-foreground">
              {currentPeriod.status === 'draft' ? 'Estimated' : 'Final'}
            </p>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {getStatusIcon(currentPeriod.status)}
          </CardHeader>
          <CardBody>
            <div className="text-lg font-medium">{getStatusBadge(currentPeriod.status)}</div>
            <p className="text-xs text-muted-foreground">
              Due: {format(new Date(currentPeriod.dueDate), "MMM d, yyyy")}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Billing Details */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Breakdown - {currentPeriod.period}</CardTitle>
          <CardDescription>
            Detailed breakdown of fees for the selected period
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            {/* Fee Structure */}
            <div>
              <h4 className="font-medium mb-2">Fee Structure</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span>Redemption Processing Fee</span>
                  <span className="font-medium">£0.50 per redemption</span>
                </div>
                <p className="text-sm text-gray-600">
                  This fee covers payment processing, platform maintenance, and customer support.
                </p>
              </div>
            </div>

            {/* Calculation */}
            <div>
              <h4 className="font-medium mb-2">Calculation</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Redemption Processing Fee</TableCell>
                    <TableCell>{currentPeriod.redemptions}</TableCell>
                    <TableCell>£{feePerRedemption}</TableCell>
                    <TableCell className="text-right font-medium">
                      £{currentPeriod.totalFees}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">Total Due</TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      £{currentPeriod.totalFees}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Payment Information */}
            <div>
              <h4 className="font-medium mb-2">Payment Information</h4>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium">Direct Debit Collection</span>
                </div>
                <p className="text-sm text-gray-700">
                  Fees are collected automatically via direct debit on the last business day of each month.
                  You'll receive an email notification 5 days before collection.
                </p>
              </div>
            </div>

            {/* Current Status */}
            <div>
              <h4 className="font-medium mb-2">Current Status</h4>
              <div className="flex items-center space-x-2">
                {getStatusIcon(currentPeriod.status)}
                {getStatusBadge(currentPeriod.status)}
                <span className="text-sm text-gray-600">
                  {currentPeriod.status === 'draft' && "Fees are being calculated for this period"}
                  {currentPeriod.status === 'pending_dd' && "Direct debit collection scheduled"}
                  {currentPeriod.status === 'collected' && "Payment successfully collected"}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Historical Billing */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Previous billing periods and payment status
          </CardDescription>
        </CardHeader>
        <CardBody>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Redemptions</TableHead>
                <TableHead>Total Fees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingPeriods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">{period.period}</TableCell>
                  <TableCell>{period.redemptions}</TableCell>
                  <TableCell>£{period.totalFees}</TableCell>
                  <TableCell>{getStatusBadge(period.status)}</TableCell>
                  <TableCell>
                    {format(new Date(period.dueDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadInvoice(period.id)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}