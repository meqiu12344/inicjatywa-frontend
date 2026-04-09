'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  paused: boolean;
  className?: string;
}

const SCANNER_ELEMENT_ID = 'qr-scanner-region';

export default function QRScanner({ onScan, paused, className }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const startScanner = useCallback(async (scanner: Html5Qrcode) => {
    try {
      const devices = await Html5Qrcode.getCameras();
      // Prefer rear camera on mobile
      const rearCamera = devices.find(
        (d) =>
          /back|rear|environment/i.test(d.label)
      );
      const cameraId = rearCamera?.id || devices[0]?.id;

      if (!cameraId) {
        console.error('No cameras found');
        return;
      }

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (!pausedRef.current) {
            onScanRef.current(decodedText);
          }
        },
        () => {
          // Ignore scan failures (no QR in frame)
        }
      );
    } catch (err) {
      // Fallback: use facingMode constraint if camera enumeration failed
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!pausedRef.current) {
              onScanRef.current(decodedText);
            }
          },
          () => {}
        );
      } catch (fallbackErr) {
        console.error('Failed to start QR scanner:', fallbackErr);
      }
    }
  }, []);

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;

    startScanner(scanner);

    return () => {
      const state = scanner.getState();
      if (
        state === Html5QrcodeScannerState.SCANNING ||
        state === Html5QrcodeScannerState.PAUSED
      ) {
        scanner.stop().catch(() => {});
      }
    };
  }, [startScanner]);

  // Pause/resume camera based on paused prop
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    const state = scanner.getState();

    if (paused && state === Html5QrcodeScannerState.SCANNING) {
      scanner.pause(true); // pause with video freeze
    } else if (!paused && state === Html5QrcodeScannerState.PAUSED) {
      scanner.resume();
    }
  }, [paused]);

  return (
    <div className={className}>
      <div id={SCANNER_ELEMENT_ID} className="w-full overflow-hidden rounded-xl" />
    </div>
  );
}
