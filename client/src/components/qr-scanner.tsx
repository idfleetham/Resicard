import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";

interface QRScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

/**
 * Camera QR scanner with a manual-entry fallback. Calls onResult once with the
 * decoded text (or the typed code) and stops the camera.
 */
export default function QRScanner({ onResult, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    const finish = (text: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      scannerRef.current?.stop();
      onResult(text);
    };

    const scanner = new QrScanner(video, (result) => finish(result.data), {
      preferredCamera: "environment",
      highlightScanRegion: true,
      highlightCodeOutline: true,
      returnDetailedScanResult: true,
    });
    scannerRef.current = scanner;

    (async () => {
      try {
        if (!(await QrScanner.hasCamera())) {
          if (!cancelled) setError("No camera was found on this device. Type the code from the poster instead.");
          return;
        }
        await scanner.start();
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError" || String(err).toLowerCase().includes("permission")) {
          setError("Camera access was blocked. Allow the camera in your browser settings, or type the code from the poster.");
        } else {
          setError("The camera could not be started. Type the code from the poster instead.");
        }
      }
    })();

    return () => {
      cancelled = true;
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [onResult]);

  const submitManual = () => {
    const code = manual.trim();
    if (!code) return;
    doneRef.current = true;
    scannerRef.current?.stop();
    onResult(code);
  };

  return (
    <div className="flex flex-col gap-4 text-sea">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Scan the Resicard code</h2>
        <Button variant="ghost" size="icon" aria-label="Close scanner" onClick={onClose}>
          <X className="!h-5 !w-5" />
        </Button>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-sea-deep aspect-square">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#0A2A33]/80">
            <Alert className="bg-white rounded-xl border-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-brand">
        Point the camera at the Resicard QR code on the poster or at the till.
      </p>

      <div>
        <label htmlFor="manual-code" className="text-sm font-semibold">
          Or type the code printed under the QR
        </label>
        <div className="flex gap-2 mt-1">
          <Input
            id="manual-code"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
            placeholder="e.g. AB12CD"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-12 rounded-xl text-base"
          />
          <Button className="h-12 px-6" onClick={submitManual} disabled={!manual.trim()}>
            Go
          </Button>
        </div>
      </div>
    </div>
  );
}
