import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CameraOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  onToggleScanning: () => void;
}

export default function QRScanner({ onScan, isScanning, onToggleScanning }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string>("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        onScan(result.data);
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment', // Use back camera on mobile
      }
    );

    qrScannerRef.current = scanner;

    // Check camera permissions
    QrScanner.hasCamera().then((hasCamera) => {
      if (!hasCamera) {
        setError("No camera found on this device");
        setHasPermission(false);
      } else {
        setHasPermission(true);
      }
    }).catch(() => {
      setError("Unable to access camera");
      setHasPermission(false);
    });

    return () => {
      scanner.destroy();
    };
  }, [onScan]);

  useEffect(() => {
    if (!qrScannerRef.current) return;

    if (isScanning && hasPermission) {
      qrScannerRef.current.start().catch((err) => {
        console.error('Failed to start camera:', err);
        setError("Failed to start camera. Please ensure camera permissions are granted.");
      });
    } else {
      qrScannerRef.current.stop();
    }
  }, [isScanning, hasPermission]);

  if (hasPermission === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Camera Access Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Camera access is required to scan QR codes. Please enable camera permissions in your browser settings."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>QR Code Scanner</span>
          <Button
            onClick={onToggleScanning}
            variant={isScanning ? "destructive" : "default"}
            size="sm"
          >
            {isScanning ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Scanning
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Start Scanning
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full max-w-md mx-auto rounded-lg border"
            style={{ display: isScanning ? 'block' : 'none' }}
          />
          {!isScanning && (
            <div className="w-full max-w-md mx-auto h-64 bg-muted rounded-lg border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Click "Start Scanning" to begin</p>
              </div>
            </div>
          )}
        </div>
        {error && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}