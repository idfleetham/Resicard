import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";
import { DESTRUCTIVE_OUTLINE, SectionTitle } from "./portal-ui";

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="bg-white rounded-2xl p-5 space-y-4">
        <SectionTitle>Your Resicard code</SectionTitle>
        <p className="text-sm text-slate-brand">Residents scan this at the till with their phone, pick an offer and show staff the green screen.</p>
        {isLoading || !data ? (
          <div className="aspect-square max-w-xs bg-foam rounded-2xl animate-pulse" />
        ) : (
          <img src={data.qrDataUrl} alt="Your Resicard QR code" className="w-full max-w-xs rounded-2xl bg-white" />
        )}
        {data && (
          <p className="font-mono text-xs text-slate-brand break-all">{data.url}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 space-y-3">
        <SectionTitle>Put it on show</SectionTitle>
        <p className="text-sm text-slate-brand">Print the A4 poster for the till or the window. The PNG is for menus and your own signage.</p>
        <Button variant="buoy" className="h-12 w-full" onClick={printPoster} disabled={!data}>
          <Printer className="h-5 w-5" /> Print poster
        </Button>
        <Button variant="outline" className="h-12 w-full bg-white" onClick={downloadPng} disabled={!data}>
          <Download className="h-5 w-5" /> Download PNG
        </Button>
        <div className="pt-4 mt-4 border-t border-[#E6E9E8] space-y-3">
          <Button variant="outline" className={`h-12 w-full ${DESTRUCTIVE_OUTLINE}`} onClick={() => setConfirmOpen(true)} disabled={!data || rotate.isPending}>
            <RefreshCw className="h-5 w-5" /> Generate a new code
          </Button>
          <p className="text-xs text-slate-brand">Only if a poster has gone missing. Old printed codes stop working straight away.</p>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">Generate a new code?</AlertDialogTitle>
            <AlertDialogDescription>
              Every poster and sticker you have printed will stop working. You will need to print and put up the new code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-11 rounded-full bg-[#B5321A] text-white hover:bg-[#93290F]" onClick={() => rotate.mutate()}>
              Generate new code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
