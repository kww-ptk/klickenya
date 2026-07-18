"use client";
import { useEffect, useRef, useState } from "react";

type ScanResult =
  | { result: "valid"; attendeeName: string; tierName: string; checkedInCount: number }
  | { result: "already_used"; attendeeName?: string; checkedInAt?: string }
  | { result: "wrong_event"; tierName?: string }
  | { result: "cancelled"; attendeeName?: string }
  | { result: "invalid" };

const COLORS: Record<ScanResult["result"], string> = {
  valid: "bg-green-600",
  already_used: "bg-amber-600",
  wrong_event: "bg-orange-700",
  cancelled: "bg-red-700",
  invalid: "bg-red-700",
};
const LABELS: Record<ScanResult["result"], string> = {
  valid: "✓ VALID — LET IN",
  already_used: "⚠ ALREADY SCANNED",
  wrong_event: "✗ WRONG EVENT",
  cancelled: "✗ CANCELLED",
  invalid: "✗ NOT A VALID TICKET",
};

export default function ScannerClient({
  eventSanityId,
  eventTitle,
}: {
  eventSanityId: string;
  eventTitle: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const busyRef = useRef(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [checkedIn, setCheckedIn] = useState<number | null>(null);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState(false);

  async function validate(code: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await fetch("/api/dashboard/events/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSanityId, code }),
      });
      if (!res.ok) { setLast({ result: "invalid" }); return; }
      const json = (await res.json()) as ScanResult;
      setLast(json);
      if (json.result === "valid") setCheckedIn(json.checkedInCount);
      if (navigator.vibrate) navigator.vibrate(json.result === "valid" ? 80 : [80, 60, 80]);
    } finally {
      setTimeout(() => { busyRef.current = false; }, 2000);
    }
  }

  useEffect(() => {
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null;
    (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (!videoRef.current) return;
        scanner = new QrScanner(
          videoRef.current,
          (r: { data: string }) => {
            const code = r.data.split("/").pop()?.trim().toUpperCase() ?? "";
            if (code) validate(code);
          },
          { returnDetailedScanResult: true, highlightScanRegion: true },
        );
        await scanner.start();
      } catch {
        setCameraError(true);
      }
    })();
    return () => { scanner?.stop(); scanner?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-lg font-bold">{eventTitle}</h1>
      <p className="text-sm text-neutral-500">
        Ticket scanner{checkedIn != null ? ` · ${checkedIn} checked in` : ""}
      </p>

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
          <p className="text-xl font-extrabold tracking-wide">{LABELS[last.result]}</p>
          {"attendeeName" in last && last.attendeeName && (
            <p className="mt-1 text-sm opacity-90">{last.attendeeName}</p>
          )}
          {last.result === "valid" && <p className="text-sm opacity-90">{last.tierName}</p>}
          {last.result === "already_used" && last.checkedInAt && (
            <p className="text-sm opacity-90">
              at {new Date(last.checkedInAt).toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi" })}
            </p>
          )}
        </div>
      )}

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) validate(manual.trim().toUpperCase());
          setManual("");
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
    </main>
  );
}
