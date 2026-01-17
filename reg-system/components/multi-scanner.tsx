"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanLine, Nfc, Loader2, Wifi, WifiOff } from "lucide-react";

interface MultiScannerProps {
  onScan: (admissionNumber: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

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
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);
  const [nfcError, setNfcError] = useState("");
  const [scanMode, setScanMode] = useState<"keyboard" | "nfc">("keyboard");
  const [lastScanTime, setLastScanTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nfcReaderRef = useRef<NDEFReader | null>(null);

  // Barcode scanner detection - scanners type fast and end with Enter
  const keyTimestamps = useRef<number[]>([]);
  const BARCODE_SPEED_THRESHOLD = 50; // ms between keystrokes for barcode scanner
  const BARCODE_MIN_LENGTH = 3; // minimum characters for valid scan

  // Check if Web NFC is supported
  useEffect(() => {
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setNfcSupported(true);
    }
  }, []);

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
  }, [lastScanTime, onScan]);

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
  }, [inputValue, handleScan]);

  // Start Web NFC scanning
  const startNfcScan = async () => {
    if (!nfcSupported || !window.NDEFReader) {
      setNfcError("NFC not supported on this device");
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
        // Try to read text from NFC tag
        for (const record of event.message.records) {
          if (record.recordType === "text") {
            const decoder = new TextDecoder();
            const text = decoder.decode(record.data);
            handleScan(text);
            return;
          }
        }

        // If no text record, use serial number as fallback
        if (event.serialNumber) {
          handleScan(event.serialNumber);
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

  // Stop NFC scanning
  const stopNfcScan = () => {
    setNfcActive(false);
    setScanMode("keyboard");
    nfcReaderRef.current = null;
    inputRef.current?.focus();
  };

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

        {nfcSupported && (
          <Badge
            variant={nfcActive ? "default" : "outline"}
            className={`gap-2 cursor-pointer transition-all ${nfcActive ? "bg-blue-500" : ""}`}
            onClick={nfcActive ? stopNfcScan : startNfcScan}
          >
            {nfcActive ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                NFC Active - Tap to stop
              </>
            ) : (
              <>
                <Nfc className="h-3 w-3" />
                Tap to enable NFC
              </>
            )}
          </Badge>
        )}
      </div>

      {/* NFC Error */}
      {nfcError && (
        <div className="text-center text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
          {nfcError}
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
              <span className="text-sm">NFC Ready</span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Scan barcode, tap NFC card, or type admission number and press Enter</p>
        {nfcSupported && !nfcActive && (
          <p className="text-blue-500">NFC available - click the badge above to enable</p>
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
