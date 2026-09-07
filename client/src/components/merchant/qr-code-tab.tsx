import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";

interface ScanCode {
  scanCode: string;
  url: string;
  qrDataUrl: string;
}

export default function QrCodeTab({ merchantName }: { merchantName: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data, isLoading } = useQuery<ScanCode>({ queryKey: ["/api/merchant/scan-code"] });

  const rotate = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/merchant/scan-code/rotate")).json() as Promise<ScanCode>,
    onSuccess: (next) => {
      queryClient.setQueryData(["/api/merchant/scan-code"], next);
      toast({ title: "New code generated", description: "Print and replace your old posters." });
    },
    onError: (err) => toast({ title: "Could not generate a new code", description: errorMessage(err), variant: "destructive" }),
  });

  const printPoster = async () => {
    try {
      const res = await apiRequest("GET", "/api/merchant/poster");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) toast({ title: "Pop-up blocked", description: "Allow pop-ups for this site to open the poster." });
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast({ title: "Could not open poster", description: errorMessage(err), variant: "destructive" });
    }
  };

  const downloadPng = () => {
    if (!data) return;
    const a = document.createElement("a");
    a.href = data.qrDataUrl;
    a.download = `resicard-${merchantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`;
    a.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Your Resicard code</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">Residents scan this at the till with their phone, pick an offer and show staff the green screen.</p>
          {isLoading || !data ? (
            <div className="aspect-square max-w-xs bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <img src={data.qrDataUrl} alt="Your Resicard QR code" className="w-full max-w-xs rounded-xl border border-slate-200 bg-white" />
          )}
          {data && (
            <p className="text-xs text-slate-500 break-all">
              <span className="font-medium text-slate-700">Link: </span>{data.url}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Put it on show</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button className="h-12 w-full justify-start" onClick={printPoster} disabled={!data}>
            <Printer className="h-5 w-5 mr-2" /> Print poster (A4)
          </Button>
          <Button variant="outline" className="h-12 w-full justify-start" onClick={downloadPng} disabled={!data}>
            <Download className="h-5 w-5 mr-2" /> Download PNG
          </Button>
          <Button variant="outline" className="h-12 w-full justify-start text-red-600" onClick={() => setConfirmOpen(true)} disabled={!data || rotate.isPending}>
            <RefreshCw className="h-5 w-5 mr-2" /> Generate a new code
          </Button>
          <p className="text-xs text-slate-500">Generate a new code only if a poster has gone missing. Old printed codes stop working straight away.</p>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate a new code?</AlertDialogTitle>
            <AlertDialogDescription>
              Every poster and sticker you have printed will stop working. You will need to print and put up the new code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-11 bg-red-600 hover:bg-red-700" onClick={() => rotate.mutate()}>
              Generate new code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
