import { useEffect, useRef, useState, useCallback } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
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
  const [isInitializing, setIsInitializing] = useState(false);

  const initializeScanner = useCallback(async () => {
    if (!videoRef.current || qrScannerRef.current) return;

    setIsInitializing(true);
    setError("");

    try {
      // Check camera availability first
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setError("No camera found on this device");
        setHasPermission(false);
        setIsInitializing(false);
        return;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result: any) => {
          try {
            const data = result?.data || result;
            if (data) {
              onScan(data);
            }
          } catch (scanError) {
            console.error('Scan result error:', scanError);
            setError("Error processing scan result");
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
        }
      );

      qrScannerRef.current = scanner;
      setHasPermission(true);
    } catch (err) {
      console.error('Scanner initialization error:', err);
      setError(`Unable to initialize camera: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setHasPermission(false);
    } finally {
      setIsInitializing(false);
    }
  }, [onScan]);

  useEffect(() => {
    if (isScanning && !qrScannerRef.current) {
      initializeScanner();
    }
    
    return () => {
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
        } catch (cleanupError) {
          console.warn('Scanner cleanup error:', cleanupError);
        } finally {
          qrScannerRef.current = null;
        }
      }
    };
  }, [isScanning, initializeScanner]);

  useEffect(() => {
    if (!qrScannerRef.current) return;

    if (isScanning && hasPermission) {
      setError(""); // Clear previous errors
      qrScannerRef.current.start().catch((err) => {
        console.error('Failed to start camera:', err);
        setError("Failed to start camera. Please ensure camera permissions are granted.");
      });
    } else {
      try {
        qrScannerRef.current.stop();
        if (!isScanning) {
          setError(""); // Clear errors when manually stopping
        }
      } catch (err) {
        console.warn('Failed to stop camera:', err);
      }
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
        <CardBody>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Camera access is required to scan QR codes. Please enable camera permissions in your browser settings."}
            </AlertDescription>
          </Alert>
        </CardBody>
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
      <CardBody>
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
      </CardBody>
    </Card>
  );
}