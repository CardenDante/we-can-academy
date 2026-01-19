"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanLine, Nfc, Loader2, Wifi, WifiOff, CheckCircle, QrCode, Camera } from "lucide-react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";

interface MultiScannerProps {
  onScan: (admissionNumber: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// ACR122U NFC Reader Support (PC/SC based)
type NfcReaderType = "web-nfc" | "acr122u" | "none";

// Extend Window interface for Web NFC API
declare global {
  interface Window {
    NDEFReader?: new () => NDEFReader;
  }

  interface NDEFReader {
    scan: () => Promise<void>;
    onreading: ((event: NDEFReadingEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
  }

  interface NDEFReadingEvent extends Event {
    message: NDEFMessage;
    serialNumber: string;
  }

  interface NDEFMessage {
    records: NDEFRecord[];
  }

  interface NDEFRecord {
    recordType: string;
    data: ArrayBuffer;
  }
}

export function MultiScanner({ onScan, disabled = false, placeholder = "Scan or enter admission number..." }: MultiScannerProps) {
  const [inputValue, setInputValue] = useState("");
  const [nfcReaderType, setNfcReaderType] = useState<NfcReaderType>("none");
  const [nfcActive, setNfcActive] = useState(false);
  const [nfcError, setNfcError] = useState("");
  const [nfcStatus, setNfcStatus] = useState<string>("");
  const [qrActive, setQrActive] = useState(false);
  const [qrError, setQrError] = useState("");
  const [scanMode, setScanMode] = useState<"keyboard" | "nfc" | "qr">("keyboard");
  const [lastScanTime, setLastScanTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nfcReaderRef = useRef<NDEFReader | null>(null);
  const pollingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const qrScannerId = "qr-scanner-region";

  // Barcode scanner detection - scanners type fast and end with Enter
  const keyTimestamps = useRef<number[]>([]);
  const BARCODE_SPEED_THRESHOLD = 50; // ms between keystrokes for barcode scanner
  const BARCODE_MIN_LENGTH = 3; // minimum characters for valid scan

  // Check what NFC readers are available
  useEffect(() => {
    // NFC DISABLED - Commenting out NFC functionality
    /*
    // Check for Web NFC (mobile browsers)
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setNfcReaderType("web-nfc");
      return;
    }

    // Check for ACR122U service
    checkAcr122uService();
    */
  }, []);

  // Check if ACR122U service is available
  // NFC DISABLED - Commented out
  const checkAcr122uService = async () => {
    /*
    try {
      const response = await fetch("/api/nfc?action=health", {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok") {
          setNfcReaderType("acr122u");
          setNfcStatus("ACR122U service detected");
        }
      }
    } catch (err) {
      // ACR122U service not available, that's fine
      console.log("ACR122U service not available");
    }
    */
  };

  // Auto-focus input on mount and after each scan
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Debounce scan to prevent double-triggers
  const handleScan = useCallback((value: string) => {
    const now = Date.now();
    if (now - lastScanTime < 1000) return; // Ignore scans within 1 second

    const trimmed = value.trim();
    if (trimmed.length >= BARCODE_MIN_LENGTH) {
      setLastScanTime(now);
      onScan(trimmed);
      setInputValue("");

      // Re-focus input for next scan
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [lastScanTime, onScan, BARCODE_MIN_LENGTH]);

  // Handle keyboard/barcode input
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();

    if (e.key === "Enter") {
      e.preventDefault();
      handleScan(inputValue);
      keyTimestamps.current = [];
      return;
    }

    // Track keystroke timing for barcode detection
    keyTimestamps.current.push(now);

    // Keep only recent timestamps
    keyTimestamps.current = keyTimestamps.current.filter(t => now - t < 500);
  }, [inputValue, handleScan]);

  // Detect rapid input (barcode scanner) and auto-submit
  useEffect(() => {
    if (inputValue.length < BARCODE_MIN_LENGTH) return;

    const timestamps = keyTimestamps.current;
    if (timestamps.length < 2) return;

    // Calculate average time between keystrokes
    let totalGap = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalGap += timestamps[i] - timestamps[i - 1];
    }
    const avgGap = totalGap / (timestamps.length - 1);

    // If typing is very fast (barcode scanner), auto-submit after a brief pause
    if (avgGap < BARCODE_SPEED_THRESHOLD) {
      const timeoutId = setTimeout(() => {
        handleScan(inputValue);
        keyTimestamps.current = [];
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [inputValue, handleScan, BARCODE_SPEED_THRESHOLD]);

  // ACR122U Long-polling loop
  const startAcr122uPolling = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setNfcActive(true);
    setNfcError("");
    setScanMode("nfc");

    while (pollingRef.current) {
      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const response = await fetch("/api/nfc?action=poll", {
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          setNfcError(errorData.error || "NFC service error");
          break;
        }

        const data = await response.json();

        if (data.success && data.data) {
          // Card scanned!
          const admissionNumber = data.data.admissionNumber;
          console.log("[ACR122U] Card scanned:", admissionNumber);
          handleScan(admissionNumber);
        }

        // Continue polling
      } catch (err: any) {
        if (err.name === "AbortError") {
          // Polling was cancelled, that's ok
          break;
        }

        console.error("[ACR122U] Polling error:", err);
        setNfcError("Connection to NFC service lost");
        break;
      }
    }

    pollingRef.current = false;
    abortControllerRef.current = null;
  }, [handleScan]);

  const stopAcr122uPolling = useCallback(() => {
    pollingRef.current = false;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setNfcActive(false);
    setScanMode("keyboard");
    inputRef.current?.focus();
  }, []);

  // Web NFC scanning
  const startWebNfcScan = async () => {
    if (!window.NDEFReader) {
      setNfcError("Web NFC not supported on this device");
      return;
    }

    try {
      const ndef = new window.NDEFReader();
      nfcReaderRef.current = ndef;

      await ndef.scan();
      setNfcActive(true);
      setNfcError("");
      setScanMode("nfc");

      ndef.onreading = (event) => {
        console.log("NFC tag detected:", event);

        // Try to extract data from various record types
        let extractedData = "";

        for (const record of event.message.records) {
          console.log("Record type:", record.recordType, "Data:", record.data);

          // Handle text records
          if (record.recordType === "text") {
            const decoder = new TextDecoder();
            const text = decoder.decode(record.data);
            extractedData = text;
            break;
          }

          // Handle URL records (common in NFC cards)
          if (record.recordType === "url") {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            // Extract admission number from URL if present
            // Example: https://wecan.edu/student/12345 -> extract 12345
            const match = url.match(/\d+/);
            if (match) {
              extractedData = match[0];
              break;
            }
          }

          // Handle absolute-url records
          if (record.recordType === "absolute-url") {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            const match = url.match(/\d+/);
            if (match) {
              extractedData = match[0];
              break;
            }
          }

          // Handle external type records
          if (record.recordType.includes("external") || record.recordType.includes("mime")) {
            const decoder = new TextDecoder();
            try {
              const text = decoder.decode(record.data);
              extractedData = text;
              break;
            } catch (e) {
              console.error("Failed to decode external record:", e);
            }
          }
        }

        // Use extracted data if found, otherwise use serial number
        if (extractedData) {
          handleScan(extractedData.trim());
        } else if (event.serialNumber) {
          // Format serial number to remove colons and make it usable
          const formattedSerial = event.serialNumber.replace(/:/g, "");
          handleScan(formattedSerial);
        } else {
          setNfcError("Could not read data from NFC card");
        }
      };

      ndef.onerror = () => {
        setNfcError("NFC read error");
        setNfcActive(false);
      };
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setNfcError("NFC permission denied. Please allow NFC access.");
      } else if (err.name === "NotSupportedError") {
        setNfcError("NFC not supported on this device.");
      } else {
        setNfcError(`NFC error: ${err.message}`);
      }
      setNfcActive(false);
    }
  };

  const stopWebNfcScan = () => {
    setNfcActive(false);
    setScanMode("keyboard");
    nfcReaderRef.current = null;
    inputRef.current?.focus();
  };

  // Start NFC scanning based on reader type
  const startNfcScan = async () => {
    if (nfcReaderType === "web-nfc") {
      await startWebNfcScan();
    } else if (nfcReaderType === "acr122u") {
      await startAcr122uPolling();
    }
  };

  // Stop NFC scanning
  const stopNfcScan = () => {
    if (nfcReaderType === "web-nfc") {
      stopWebNfcScan();
    } else if (nfcReaderType === "acr122u") {
      stopAcr122uPolling();
    }
  };

  // QR Code scanning
  const startQrScan = async () => {
    try {
      console.log("[QR Scanner] Starting QR scanner...");

      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported. Please use HTTPS or a modern browser.");
      }

      setQrActive(true);
      setQrError("");
      setScanMode("qr");

      // Wait for DOM element to be rendered before initializing scanner
      // Use setTimeout to let React render the qr-scanner-region div first
      setTimeout(async () => {
        try {
          const element = document.getElementById(qrScannerId);
          if (!element) {
            throw new Error("QR scanner element not found in DOM. Please try again.");
          }

          const html5QrCode = new Html5Qrcode(qrScannerId);
          qrScannerRef.current = html5QrCode;

          console.log("[QR Scanner] Requesting camera access...");

          // Start continuous scanning
          await html5QrCode.start(
            { facingMode: "environment" }, // Use back camera
            {
              fps: 10, // Scan 10 times per second for fast detection
              qrbox: { width: 250, height: 250 }, // Scanning area
            },
            (decodedText) => {
              // Success callback - QR code detected
              console.log("[QR Scanner] Decoded:", decodedText);
              handleScan(decodedText);
              // Continue scanning - don't stop after each scan
            },
            (errorMessage) => {
              // Error callback - just ignore, it fires constantly when no QR detected
            }
          );

          console.log("[QR Scanner] Camera started successfully");
        } catch (err: any) {
          console.error("[QR Scanner] Initialization error:", err);

          if (err.name === "NotAllowedError") {
            setQrError("Camera permission denied. Please allow camera access and try again.");
          } else if (err.name === "NotFoundError") {
            setQrError("No camera found on this device. QR scanning requires a camera.");
          } else if (err.name === "NotReadableError") {
            setQrError("Camera is already in use by another application. Please close other apps and try again.");
          } else if (err.message && err.message.includes("HTTPS")) {
            setQrError("Camera requires HTTPS. Please access this page using https://");
          } else if (err.message && err.message.includes("secure")) {
            setQrError("Camera requires secure context (HTTPS). Please use https:// instead of http://");
          } else {
            setQrError(`QR Scanner error: ${err.message || err.toString() || "Failed to start camera. Check console for details."}`);
          }
          setQrActive(false);
          setScanMode("keyboard");
        }
      }, 100); // 100ms delay to ensure DOM is ready

    } catch (err: any) {
      console.error("[QR Scanner] Full error:", err);
      console.error("[QR Scanner] Error name:", err.name);
      console.error("[QR Scanner] Error message:", err.message);
      setQrError(`Setup error: ${err.message || "Failed to initialize QR scanner"}`);
      setQrActive(false);
      setScanMode("keyboard");
    }
  };

  const stopQrScan = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      } catch (err) {
        console.error("[QR Scanner] Error stopping:", err);
      }
      qrScannerRef.current = null;
    }
    setQrActive(false);
    setScanMode("keyboard");
    inputRef.current?.focus();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (nfcReaderType === "acr122u" && pollingRef.current) {
        stopAcr122uPolling();
      }
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(console.error);
      }
    };
  }, [nfcReaderType, stopAcr122uPolling]);

  const nfcSupported = nfcReaderType !== "none";
  const readerTypeLabel = nfcReaderType === "acr122u" ? "ACR122U" : "Web NFC";

  return (
    <div className="space-y-4">
      {/* Scan Status Indicators */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Badge
          variant="outline"
          className={`gap-2 ${scanMode === "keyboard" ? "border-green-500 text-green-600" : ""}`}
        >
          <ScanLine className="h-3 w-3" />
          Barcode Ready
        </Badge>

        {/* NFC DISABLED - Commented out */}
        {/* {nfcSupported && (
          <Badge
            variant={nfcActive ? "default" : "outline"}
            className={`gap-2 cursor-pointer transition-all ${nfcActive ? "bg-blue-500" : ""}`}
            onClick={nfcActive ? stopNfcScan : startNfcScan}
          >
            {nfcActive ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {readerTypeLabel} Active - Tap to stop
              </>
            ) : (
              <>
                <Nfc className="h-3 w-3" />
                Enable {readerTypeLabel} Reader
              </>
            )}
          </Badge>
        )} */}

        <Badge
          variant={qrActive ? "default" : "outline"}
          className={`gap-2 cursor-pointer transition-all ${qrActive ? "bg-purple-500" : ""}`}
          onClick={qrActive ? stopQrScan : startQrScan}
        >
          {qrActive ? (
            <>
              <Camera className="h-3 w-3 animate-pulse" />
              QR Scanner Active - Tap to stop
            </>
          ) : (
            <>
              <QrCode className="h-3 w-3" />
              Enable QR Scanner
            </>
          )}
        </Badge>
      </div>

      {/* NFC Status */}
      {nfcStatus && !nfcError && (
        <div className="text-center text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-2 rounded flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {nfcStatus}
        </div>
      )}

      {/* NFC Error */}
      {nfcError && (
        <div className="text-center text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
          {nfcError}
        </div>
      )}

      {/* QR Error */}
      {qrError && (
        <div className="text-center text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
          {qrError}
        </div>
      )}

      {/* QR Scanner Camera View */}
      {qrActive && (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <div id={qrScannerId} className="w-full" />
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded">
              Position QR code within the frame
            </p>
          </div>
        </div>
      )}

      {/* Main Input */}
      <div className="relative">
        <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-14 h-16 text-lg font-mono tracking-wider"
          autoFocus
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {nfcActive && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="flex items-center gap-2 text-blue-500">
              <Wifi className="h-5 w-5 animate-pulse" />
              <span className="text-sm">{readerTypeLabel} Ready</span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Scan barcode, scan QR code, or type admission number and press Enter</p>
        {/* NFC DISABLED */}
        {/* {nfcSupported && !nfcActive && (
          <p className="text-blue-500">{readerTypeLabel} available - click the badge above to enable</p>
        )} */}
        {!qrActive && (
          <p className="text-purple-500">QR Scanner available - click the badge above to enable</p>
        )}
      </div>
    </div>
  );
}

// Simplified component for just keyboard/barcode input (for staff page etc)
export function BarcodeInput({
  onScan,
  disabled = false,
  placeholder = "Scan or enter admission number...",
  autoSubmit = true
}: {
  onScan: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoSubmit?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanTime = useRef(0);
  const keyTimestamps = useRef<number[]>([]);

  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = useCallback((inputValue: string) => {
    const now = Date.now();
    if (now - lastScanTime.current < 500) return;

    const trimmed = inputValue.trim();
    if (trimmed.length >= 3) {
      lastScanTime.current = now;
      onScan(trimmed);
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [onScan]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(value);
      keyTimestamps.current = [];
    } else if (autoSubmit) {
      const now = Date.now();
      keyTimestamps.current.push(now);
      keyTimestamps.current = keyTimestamps.current.filter(t => now - t < 500);
    }
  };

  // Auto-submit for fast barcode input
  useEffect(() => {
    if (!autoSubmit || value.length < 3) return;

    const timestamps = keyTimestamps.current;
    if (timestamps.length < 2) return;

    let totalGap = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalGap += timestamps[i] - timestamps[i - 1];
    }
    const avgGap = totalGap / (timestamps.length - 1);

    if (avgGap < 50) {
      const timeoutId = setTimeout(() => {
        handleSubmit(value);
        keyTimestamps.current = [];
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [value, autoSubmit, handleSubmit]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      autoFocus
    />
  );
}
