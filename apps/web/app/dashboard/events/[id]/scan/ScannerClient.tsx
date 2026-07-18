"use client";
import { useEffect, useRef, useState } from "react";

type ScanResult =
  | { result: "valid"; attendeeName: string; tierName: string; checkedInCount: number }
  | { result: "already_used"; attendeeName?: string; checkedInAt?: string }
  | { result: "wrong_event"; tierName?: string }
  | { result: "wrong_date"; occurrenceDate?: string; attendeeName?: string }
  | { result: "cancelled"; attendeeName?: string }
  | { result: "invalid" };

const COLORS: Record<ScanResult["result"], string> = {
  valid: "bg-green-600",
  already_used: "bg-amber-600",
  wrong_event: "bg-orange-700",
  wrong_date: "bg-orange-800",
  cancelled: "bg-red-700",
  invalid: "bg-red-700",
};
const LABELS: Record<ScanResult["result"], string> = {
  valid: "✓ VALID — LET IN",
  already_used: "⚠ ALREADY SCANNED",
  wrong_event: "✗ WRONG EVENT",
  wrong_date: "✗ WRONG DATE",
  cancelled: "✗ CANCELLED",
  invalid: "✗ NOT A VALID TICKET",
};

function formatOccurrence(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Nairobi",
  });
}

export default function ScannerClient({
  eventSanityId,
  eventTitle,
  initialCheckedIn,
  totalIssued,
  occurrenceDates,
  defaultScanDate,
}: {
  eventSanityId: string;
  eventTitle: string;
  initialCheckedIn: number;
  totalIssued: number;
  occurrenceDates?: string[];
  defaultScanDate?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ start: () => Promise<void>; stop: () => void; destroy: () => void } | null>(null);
  const busyRef = useRef(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const [scanDate, setScanDate] = useState<string | null>(
    defaultScanDate ?? (occurrenceDates?.[0] ?? null),
  );
  // The camera scan callback is bound once at mount, so read scanDate through a
  // ref to avoid sending a stale night when the operator switches dates.
  const scanDateRef = useRef(scanDate);
  scanDateRef.current = scanDate;

  async function validate(code: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    // Pause the camera while the result is shown — nothing scans until "Scan next".
    scannerRef.current?.stop();
    try {
      const sd = scanDateRef.current;
      const res = await fetch("/api/dashboard/events/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSanityId, code, ...(sd ? { scanDate: sd } : {}) }),
      });
      if (!res.ok) { setLast({ result: "invalid" }); return; }
      const json = (await res.json()) as ScanResult;
      setLast(json);
      if (json.result === "valid") setCheckedIn(json.checkedInCount);
      if (navigator.vibrate) navigator.vibrate(json.result === "valid" ? 80 : [80, 60, 80]);
    } catch {
      setLast({ result: "invalid" });
    }
    // busyRef stays true — the operator must press "Scan next" to continue.
  }

  function scanNext() {
    setLast(null);
    busyRef.current = false;
    scannerRef.current?.start().catch(() => setCameraError(true));
  }

  useEffect(() => {
    (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (!videoRef.current) return;
        const scanner = new QrScanner(
          videoRef.current,
          (r: { data: string }) => {
            const code = r.data.split("/").pop()?.trim().toUpperCase() ?? "";
            if (code) validate(code);
          },
          { returnDetailedScanResult: true, highlightScanRegion: true },
        );
        scannerRef.current = scanner;
        await scanner.start();
      } catch {
        setCameraError(true);
      }
    })();
    return () => { scannerRef.current?.stop(); scannerRef.current?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = totalIssued > 0 ? Math.round((checkedIn / totalIssued) * 100) : 0;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-lg font-bold">{eventTitle}</h1>

      {/* Recurring events: which night are we scanning for? */}
      {occurrenceDates && occurrenceDates.length > 0 && (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
          <label className="block px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Scanning for
          </label>
          <select
            value={scanDate ?? ""}
            onChange={(e) => setScanDate(e.target.value || null)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[16px] font-medium"
          >
            {occurrenceDates.map((d) => (
              <option key={d} value={d}>
                {formatOccurrence(d)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Live check-in analytics */}
      <div className="mt-2 rounded-2xl bg-neutral-900 p-4 text-center text-white">
        <p className="text-4xl font-extrabold leading-none">
          {checkedIn}
          <span className="text-xl font-medium text-neutral-400"> / {totalIssued}</span>
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-neutral-400">
          checked in{totalIssued > 0 ? ` · ${pct}%` : ""}
        </p>
      </div>

      {!cameraError ? (
        <div className="mt-4 overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover" />
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-neutral-100 p-4 text-sm">
          Camera unavailable — use manual entry below.
        </p>
      )}

      {last && (
        <div className={`mt-4 rounded-2xl p-5 text-center text-white ${COLORS[last.result]}`}>
          <p className="text-2xl font-extrabold tracking-wide">{LABELS[last.result]}</p>
          {"attendeeName" in last && last.attendeeName && (
            <p className="mt-1 text-sm opacity-90">{last.attendeeName}</p>
          )}
          {last.result === "valid" && <p className="text-sm opacity-90">{last.tierName}</p>}
          {last.result === "wrong_date" && last.occurrenceDate && (
            <p className="text-sm opacity-90">ticket is for {formatOccurrence(last.occurrenceDate)}</p>
          )}
          {last.result === "already_used" && last.checkedInAt && (
            <p className="text-sm opacity-90">
              at {new Date(last.checkedInAt).toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi" })}
            </p>
          )}
          <button
            onClick={scanNext}
            className="mt-4 w-full rounded-xl bg-white py-3.5 text-base font-bold text-neutral-900"
          >
            OK — Scan next
          </button>
        </div>
      )}

      {!last && (
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const code = manual.trim().toUpperCase();
            setManual("");
            if (code) validate(code);
          }}
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Enter code manually"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-3 text-[16px] font-mono uppercase"
          />
          <button className="rounded-lg bg-[#16130C] px-4 py-3 font-semibold text-white">Check</button>
        </form>
      )}
    </main>
  );
}
