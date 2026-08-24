/**
 * EventScannerPage — QR scanner for teachers/admins at events.
 *
 * Flow:
 *   1. Select event from dropdown
 *   2. Camera opens with QR scanner
 *   3. Scan student's QR → POST /events/:id/scan-qr
 *   4. Show result (success with student name + XP, or error)
 *   5. Auto-reset for next scan after 3 seconds
 *
 * Edge cases:
 *   - Invalid QR (not mc-event format) → "Invalid QR code"
 *   - Wrong event QR → "No registration found for this event"
 *   - Already checked in → "Already checked in" + student name
 *   - Cancelled registration → "Registration was cancelled"
 *   - Camera denied → Fallback to manual token input
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import { events as eventsApi } from "@/lib/api";

export default function EventScannerPage() {
  useMonument("jungle");

  const [eventsList, setEventsList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { type, message, student }
  const [manualToken, setManualToken] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const scannerRef = useRef(null);
  const resultTimerRef = useRef(null);

  // Fetch events
  useEffect(() => {
    eventsApi.list()
      .then(r => setEventsList(Array.isArray(r.data) ? r.data.filter(e => e.status === "active" || e.status === "registering") : []))
      .catch(() => setEventsList([]))
      .finally(() => setLoading(false));
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  // Process scanned QR data
  const processQr = useCallback(async (qrData) => {
    if (!selectedEventId) return;

    // Parse QR: "mc-event:{eventId}:{qr_token}"
    const parts = qrData.split(":");
    if (parts.length !== 3 || parts[0] !== "mc-event") {
      setScanResult({ type: "error", message: "Invalid QR — not a Math Collective event QR" });
      autoReset();
      return;
    }

    const [, qrEventId, qrToken] = parts;

    // Check if QR is for the selected event
    if (qrEventId !== selectedEventId) {
      setScanResult({ type: "error", message: "This QR is for a different event" });
      autoReset();
      return;
    }

    // Call API
    try {
      const { data } = await eventsApi.scanQr(selectedEventId, qrToken);
      setScanResult({
        type: "success",
        message: `${data.student?.name || "Student"} checked in${data.xp_awarded ? ` — +${data.xp_awarded} XP` : ""}`,
        student: data.student,
      });
      setScanCount(c => c + 1);
    } catch (err) {
      const errData = err.response?.data;
      setScanResult({
        type: errData?.student ? "warning" : "error",
        message: errData?.error || "Scan failed",
        student: errData?.student,
      });
    }

    autoReset();
  }, [selectedEventId]);

  const autoReset = () => {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => setScanResult(null), 3500);
  };

  // Start camera scanner
  const startScanner = async () => {
    if (!selectedEventId) return;
    setScanResult(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Pause scanning while processing
          scanner.pause(true);
          processQr(decodedText).finally(() => {
            // Resume after result display
            setTimeout(() => {
              try { scanner.resume(); } catch { /* ignore if stopped */ }
            }, 2000);
          });
        },
        () => { /* ignore scan failures — just means no QR in frame yet */ }
      );
    } catch (err) {
      console.error("[Scanner]", err);
      setScanning(false);
      setShowManual(true);
      setScanResult({ type: "error", message: "Camera access denied. Use manual entry below." });
    }
  };

  // Stop scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Manual token submit
  const handleManualSubmit = async () => {
    if (!manualToken.trim() || !selectedEventId) return;
    // Construct QR data and process
    await processQr(`mc-event:${selectedEventId}:${manualToken.trim()}`);
    setManualToken("");
  };

  if (loading) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="jungle" intensity={0.1} />
        <div className="relative z-10 flex min-h-[60vh] items-center justify-center">
          <Loader variant="orbit" size="lg" label="Loading events..." />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <MonumentBackground monument="jungle" intensity={0.1} />
      <div className="relative z-10 mx-auto max-w-2xl space-y-6 pb-16">
        {/* Header */}
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">Event Management</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">QR Scanner</h1>
          <p className="mt-2 text-sm text-text-muted">Scan student QR codes for check-in</p>
        </div>

        {/* Event selector */}
        <Card variant="glass">
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-dim">Select Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => { setSelectedEventId(e.target.value); stopScanner(); setScanResult(null); setScanCount(0); }}
            className="w-full rounded-xl border border-line/15 bg-surface/50 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
          >
            <option value="">— Choose an event —</option>
            {eventsList.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title} — {ev.status}</option>
            ))}
          </select>
        </Card>

        {/* Scanner area */}
        {selectedEventId && (
          <Card variant="glow">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Camera Scanner</p>
                {scanCount > 0 && (
                  <p className="mt-1 math-text text-sm text-success">{scanCount} checked in</p>
                )}
              </div>
              {!scanning ? (
                <Button size="sm" onClick={startScanner}>Start Scanner</Button>
              ) : (
                <Button size="sm" variant="danger" onClick={stopScanner}>Stop</Button>
              )}
            </div>

            {/* Camera viewport */}
            <div className="mt-4 overflow-hidden rounded-xl border border-line/15 bg-black">
              <div
                id="qr-reader"
                style={{ width: "100%", minHeight: scanning ? 300 : 0, transition: "min-height 0.3s" }}
              />
              {!scanning && (
                <div className="flex h-48 items-center justify-center text-text-dim text-sm">
                  Click "Start Scanner" to open camera
                </div>
              )}
            </div>

            {/* Scan result feedback */}
            <AnimatePresence>
              {scanResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className={`mt-4 rounded-xl border px-4 py-3 ${
                    scanResult.type === "success" ? "border-success/30 bg-success/10" :
                    scanResult.type === "warning" ? "border-warning/30 bg-warning/10" :
                    "border-danger/30 bg-danger/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {scanResult.type === "success" ? "✅" : scanResult.type === "warning" ? "⚠️" : "❌"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${
                        scanResult.type === "success" ? "text-success" :
                        scanResult.type === "warning" ? "text-warning" : "text-danger"
                      }`}>
                        {scanResult.message}
                      </p>
                      {scanResult.student && (
                        <p className="mt-0.5 break-words text-xs text-text-dim">
                          {scanResult.student.name} · {scanResult.student.email}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}

        {/* Manual fallback */}
        {selectedEventId && (
          <Card variant="solid">
            <button
              onClick={() => setShowManual(!showManual)}
              className="flex w-full items-center justify-between text-left"
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">Manual Entry (Fallback)</p>
              <span className="text-text-dim text-xs">{showManual ? "▲" : "▼"}</span>
            </button>
            <AnimatePresence>
              {showManual && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3"
                >
                  <p className="text-xs text-text-dim mb-2">Enter the student's QR token manually (32-character hex code)</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="QR token (e.g. a1b2c3d4...)"
                      value={manualToken}
                      onChange={e => setManualToken(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
                      className="flex-1 rounded-lg border border-line/15 bg-black/15 px-3 py-2 font-mono text-sm text-white outline-none focus:border-primary/30"
                    />
                    <Button size="sm" onClick={handleManualSubmit} disabled={!manualToken.trim()}>
                      Check In
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}
      </div>
    </div>
  );
}
