"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import jsQR from "jsqr";
import Button from "./Button";

interface QrScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const scanningRef = useRef(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    setScanning(false);
    setCameraStarted(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const scanFrames = useCallback(() => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) {
      requestAnimationFrame(scanFrames);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      requestAnimationFrame(scanFrames);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      stopCamera();
      onScan(code.data);
      return;
    }

    if (scanningRef.current) {
      requestAnimationFrame(scanFrames);
    }
  }, [onScan, stopCamera]);

  const startCamera = useCallback(async () => {
    setError(null);
    // Show the video element first so videoRef is available
    setCameraStarted(true);

    // Wait for React to render the video element
    await new Promise((r) => setTimeout(r, 50));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setScanning(true);
        scanningRef.current = true;
        scanFrames();
      }
    } catch (err) {
      setCameraStarted(false);
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError") {
        setError("Kamera hozzáférés megtagadva. Engedélyezd a böngésző beállításaiban.");
      } else if (name === "NotFoundError") {
        setError("Nem található kamera ezen az eszközön.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        setError("A kamera nem elérhető. Lehet, hogy másik alkalmazás használja.");
      } else {
        setError("Nem sikerült elindítani a kamerát. Próbáld másik böngészőben.");
      }
    }
  }, [scanFrames]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {!cameraStarted && !error && (
        <div className="flex flex-col items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 p-6">
          <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          <Button size="sm" onClick={startCamera}>
            Kamera indítása
          </Button>
        </div>
      )}
      <div className={`relative overflow-hidden rounded-lg bg-black ${cameraStarted ? "" : "hidden"}`}>
        <video
          ref={videoRef}
          className="w-full"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-xl border-2 border-white/60" />
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => { stopCamera(); onClose(); }}>
          Mégse
        </Button>
      </div>
    </div>
  );
}
