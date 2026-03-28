"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Button from "./Button";

interface QrScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanningRef = useRef(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        scanningRef.current = true;
        scanFrames();
      }
    } catch {
      setError("Nem sikerült hozzáférni a kamerához. Engedélyezd a kamera hozzáférést.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scanFrames = useCallback(() => {
    if (!scanningRef.current || !videoRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) {
      requestAnimationFrame(scanFrames);
      return;
    }

    // Use BarcodeDetector if available
    if ("BarcodeDetector" in window) {
      const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ["qr_code"] });
      detector.detect(video).then((barcodes) => {
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;
          if (value) {
            stopCamera();
            onScan(value);
            return;
          }
        }
        if (scanningRef.current) requestAnimationFrame(scanFrames);
      }).catch(() => {
        if (scanningRef.current) requestAnimationFrame(scanFrames);
      });
    } else {
      // Fallback: canvas-based approach won't work without a library
      setError("A böngésző nem támogatja a QR kód olvasást. Használj Chrome-ot vagy másold be a tokent kézzel.");
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScan, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="w-full"
            playsInline
            muted
          />
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-xl border-2 border-white/60" />
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => { stopCamera(); onClose(); }}>
          Mégse
        </Button>
      </div>
    </div>
  );
}
