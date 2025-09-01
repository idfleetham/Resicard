import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { MetricTile } from "@/ui/MetricTile";
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
  
  // Real billing periods (empty until actual redemptions generate billing data)
  const billingPeriods: BillingPeriod[] = [
    {
      id: "current",
      period: format(new Date(), "MMMM yyyy"),
      redemptions: 0,
      totalFees: 0,
      status: "draft",
      dueDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    },
  ];

  const currentPeriod = billingPeriods.find(p => p.id === selectedPeriod) || billingPeriods[0];
  const feePerRedemption = 0.50; // £0.50 per redemption

  const { data: billingStats } = useQuery({
    queryKey: ['/api/billing/stats'],
    enabled: !!user && user.role === 'merchant',
  });

  const handleDownloadInvoice = (periodId: string) => {
    const period = billingPeriods.find(p => p.id === periodId);
    if (!period) return;

    // Create CSV content
    const csvData = [
      ["Item", "Quantity", "Rate", "Amount"],
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
    <div className="space-y-6 bg-bg min-h-screen p-6">
      {/* Header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand1/25 via-brand2/20 to-transparent border border-white/40 shadow-xl shadow-white/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">Billing Preview</h1>
            <p className="text-slate-300 text-lg">View monthly fees and download invoices</p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40 border-white/40 shadow-xl shadow-white/20 bg-surface text-fg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface2 border-white/40 shadow-xl shadow-white/20">
                {billingPeriods.map((period) => (
                  <SelectItem key={period.id} value={period.id} className="text-fg">
                    {period.period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => handleDownloadInvoice(selectedPeriod)}
              className="bg-gradient-to-r from-brand1 to-brand2 text-white shadow-elev-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Current Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricTile 
          label="Redemptions" 
          value={currentPeriod.redemptions.toString()} 
          icon={<TrendingUp className="h-4 w-4" />}
          subtitle={currentPeriod.period}
        />
        <MetricTile 
          label="Fee Per Redemption" 
          value={`£${feePerRedemption}`} 
          icon={<CreditCard className="h-4 w-4" />}
          subtitle="Standard rate"
        />
        <MetricTile 
          label="Total Fees" 
          value={`£${currentPeriod.totalFees}`} 
          icon={<Calendar className="h-4 w-4" />}
          subtitle={currentPeriod.status === 'draft' ? 'Estimated' : 'Final'}
        />
        <MetricTile 
          label="Status" 
          value={getStatusBadge(currentPeriod.status)} 
          icon={getStatusIcon(currentPeriod.status)}
          subtitle={`Due: ${format(new Date(currentPeriod.dueDate), "MMM d, yyyy")}`}
        />
      </div>

      {/* Billing Details */}
      <Card variant="elevated" className="bg-card border border-white/40 shadow-xl shadow-white/20">
        <CardHeader>
          <CardTitle className="text-xl">Billing Breakdown - {currentPeriod.period}</CardTitle>
          <CardDescription className="text-lg">
            Detailed breakdown of fees for the selected billing period
          </CardDescription>
        </CardHeader>
        <CardBody>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-fg text-lg">Description</TableHead>
                <TableHead className="text-fg text-lg">Quantity</TableHead>
                <TableHead className="text-fg text-lg">Rate</TableHead>
                <TableHead className="text-right text-fg text-lg">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-slate-300 text-lg">Redemption Processing Fee</TableCell>
                <TableCell className="text-slate-300 text-lg">{currentPeriod.redemptions}</TableCell>
                <TableCell className="text-slate-300 text-lg">£{feePerRedemption}</TableCell>
                <TableCell className="text-right text-slate-300 text-lg">£{currentPeriod.totalFees.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow className="border-t-2 border-white/40 shadow-xl shadow-white/20Strong font-medium">
                <TableCell className="text-fg font-semibold text-lg" colSpan={3}>Total Due</TableCell>
                <TableCell className="text-right text-fg font-semibold text-lg">£{currentPeriod.totalFees.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {currentPeriod.status === 'draft' && (
            <div className="mt-4 p-4 bg-surface/50 border border-white/40 shadow-xl shadow-white/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="text-lg font-medium text-fg">Draft Invoice</h4>
                  <p className="text-base text-slate-300 mt-1">
                    This is a draft invoice. The final amount will be calculated at the end of the billing period 
                    and collected via direct debit on {format(new Date(currentPeriod.dueDate), "MMM d, yyyy")}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Payment Method */}
      <Card variant="elevated" className="bg-card border border-white/40 shadow-xl shadow-white/20">
        <CardHeader>
          <CardTitle className="text-xl">Payment Method</CardTitle>
          <CardDescription className="text-lg">How fees are collected</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-surface/50 rounded-full">
              <CreditCard className="h-6 w-6 text-fg" />
            </div>
            <div>
              <p className="font-medium text-fg text-lg">Direct Debit</p>
              <p className="text-lg text-slate-300">Fees are automatically collected monthly</p>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-lg">
              <span className="text-slate-300">Collection Date:</span>
              <span className="text-fg">End of each month</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-slate-300">Processing Fee:</span>
              <span className="text-fg">£0.50 per redemption</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-slate-300">VAT:</span>
              <span className="text-fg">Included</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}