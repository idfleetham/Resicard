import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import QRScanner from "@/components/qr-scanner";

/** Accepts a full URL (https://host/scan/ABC123), a path (/scan/ABC123) or a bare code. */
export function scanCodeFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/scan\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{4,}$/.test(trimmed)) return trimmed;
  return null;
}

interface ScanButtonProps {
  /** Open the scanner straight away (e.g. from ?scan=1). */
  autoOpen?: boolean;
}

export default function ScanButton({ autoOpen = false }: ScanButtonProps) {
  const [open, setOpen] = useState(autoOpen);
  const [bad, setBad] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [, setLocation] = useLocation();

  const handleResult = useCallback(
    (text: string) => {
      const code = scanCodeFromText(text);
      if (!code) {
        setBad(true);
        setAttempt((n) => n + 1);
        return;
      }
      setOpen(false);
      setLocation(`/scan/${encodeURIComponent(code)}`);
    },
    [setLocation],
  );

  return (
    <>
      <Button variant="buoy" className="w-full h-14 text-base" onClick={() => { setBad(false); setOpen(true); }}>
        <QrCode className="!h-6 !w-6" />
        Scan a Resicard code
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-5 rounded-2xl border-0">
          <DialogTitle className="sr-only">Scan a Resicard code</DialogTitle>
          {open && <QRScanner key={attempt} onResult={handleResult} onClose={() => setOpen(false)} />}
          {bad && (
            <p className="text-sm font-semibold text-destructive">That does not look like a Resicard code. Try again or type the code.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
