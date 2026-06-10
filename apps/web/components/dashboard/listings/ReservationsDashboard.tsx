"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { WeekView } from "./reservations-calendar/WeekView";
import { DayView } from "./reservations-calendar/DayView";
import type { CalendarReservation } from "./reservations-calendar/WeekView";
import { ReservationsSettings } from "./ReservationsSettings";
import type { RestaurantArea as SettingsArea, TimeWindow } from "./ReservationsSettings";
import { FloorMapCanvas } from "./floor-map/FloorMapCanvas";

/* ── Capacity warning threshold (tunable after pilot) ─────────────────────── */
// TODO V2: Capacity enforcement moves server-side via reservation_slots table in V2.
const CAPACITY_WARNING_THRESHOLD = 0.9;

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface Reservation {
  id: string;
  menu_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  party_size: number;
  reserved_for: string;
  duration_minutes: number;
  area_id: string | null;
  status: string;
  source: string;
  guest_message: string | null;
  owner_note: string | null;
  decline_reason: string | null;
  approved_at: string | null;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
  area_name: string | null;
  area_color_hex: string | null;
}

interface RestaurantArea {
  id: string;
  name: string;
  capacity_total: number;
  display_order: number;
  color_hex: string | null;
  is_active: boolean;
}

interface MenuSettings {
  reservationsEnabled: boolean;
  duration: number;
  leadTime: number;
  maxParty: number;
  maxAdvance: number;
  serviceChargePct: number;
  listingCity: string | null;
  timeWindows: TimeWindow[];
}

interface ReservationsDashboardProps {
  menuId: string;
  menuName: string;
  menuSlug: string;
  listingId: string;
  listingSlug: string;
  listingCity: string | null;
  initialReservations: Reservation[];
  areas: RestaurantArea[];
  initialFetchedAt: string;
  tableOrdering: boolean;
  menuSettings: MenuSettings;
}

/* ── Audio beep (Web Audio API — no external file needed) ────────────────── */
// Originally mirrored from the deleted KitchenDashboard.tsx (Web Audio API beep)

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    // Beep twice
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.value = 1100;
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext not available (e.g. restricted context)
  }
}

/* ── Nairobi timezone helpers ─────────────────────────────────────────────── */

function getTodayNairobi(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

function getNairobiWeekBounds(): { mondayMs: number; sundayEndMs: number } {
  const todayStr = getTodayNairobi();
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
  }).format(new Date(`${todayStr}T09:00:00Z`));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayIdx = weekdays.indexOf(weekdayName);
  const daysSinceMonday = (dayIdx + 6) % 7;
  const monday = new Date(`${todayStr}T00:00:00+03:00`);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  const sundayEnd = new Date(monday);
  sundayEnd.setUTCDate(monday.getUTCDate() + 7);
  sundayEnd.setUTCMilliseconds(sundayEnd.getUTCMilliseconds() - 1);
  return { mondayMs: monday.getTime(), sundayEndMs: sundayEnd.getTime() };
}

function formatFullNairobiDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    qr_menu: "QR menu",
    listing: "Klickenya listing",
    direct: "Direct link",
    phone: "Phone",
  };
  return map[source] ?? source;
}

/* ── Capacity check ──────────────────────────────────────────────────────── */

function overlappingApprovedCovers(
  pending: Reservation,
  allReservations: Reservation[],
): number {
  const start = new Date(pending.reserved_for);
  const end = new Date(start.getTime() + pending.duration_minutes * 60_000);
  return allReservations
    .filter(r => r.status === "approved")
    .filter(r => r.area_id === pending.area_id)
    .filter(r => {
      const rStart = new Date(r.reserved_for);
      const rEnd = new Date(rStart.getTime() + r.duration_minutes * 60_000);
      return rStart < end && rEnd > start;
    })
    .reduce((sum, r) => sum + r.party_size, 0);
}

/* ── Client-side WhatsApp URL generator ─────────────────────────────────── */

function buildWhatsAppUrl(
  r: Reservation,
  transition: "approved" | "declined" | "cancelled",
  restaurantName: string,
): string {
  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Nairobi",
  }).format(new Date(r.reserved_for));
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Nairobi",
  }).format(new Date(r.reserved_for));
  const phone = r.guest_phone.replace(/^\+/, "").replace(/[\s-]/g, "");

  let message: string;
  if (transition === "approved") {
    message = `Hi ${r.guest_name}, your reservation at ${restaurantName} for ${r.party_size} on ${date} at ${time} is confirmed. See you then!`;
  } else if (transition === "declined") {
    message = `Hi ${r.guest_name}, unfortunately we can't confirm your reservation for ${r.party_size} on ${date} at ${time}. Reason: ${r.decline_reason ?? ""}. Please try another time or contact us directly.`;
  } else {
    message = `Hi ${r.guest_name}, we need to cancel your reservation for ${r.party_size} on ${date} at ${time}. We're sorry for the inconvenience.`;
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/* ── Status pill ─────────────────────────────────────────────────────────── */

function StatusPill({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending:    "bg-amber-100 text-amber-700",
    approved:   "bg-green-100 text-green-700",
    declined:   "bg-red-100 text-red-600",
    cancelled:  "bg-gray-100 text-gray-500",
    checked_in: "bg-blue-100 text-blue-700",
    completed:  "bg-emerald-100 text-emerald-700",
    no_show:    "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${classes[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

/* ── Area chip ───────────────────────────────────────────────────────────── */

function AreaChip({ name, colorHex }: { name: string | null; colorHex: string | null }) {
  if (!name) {
    return <span className="text-[11px] text-text3 italic">No preference</span>;
  }
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: colorHex ? `${colorHex}22` : "#F4F1EC",
        color: colorHex ?? "#5E5848",
        border: `1px solid ${colorHex ? `${colorHex}55` : "#E2DDD5"}`,
      }}
    >
      {name}
    </span>
  );
}

/* ── Owner note ──────────────────────────────────────────────────────────── */

function OwnerNoteField({
  reservationId,
  initialNote,
  onSave,
}: {
  reservationId: string;
  initialNote: string | null;
  onSave: (id: string, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(initialNote ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const handleBlur = async () => {
    const trimmed = note.trim();
    if (trimmed === (initialNote ?? "")) return;
    setSaveState("saving");
    try {
      await onSave(reservationId, trimmed);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  };

  return (
    <div>
      <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">
        Owner note <span className="text-[10px] font-normal normal-case text-text3">(not sent to guest)</span>
      </label>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={handleBlur}
        rows={2}
        placeholder="Internal notes about this reservation…"
        className="w-full border border-border rounded-xl px-3 py-2 text-[13px] text-dark placeholder:text-text3 outline-none focus:border-amber transition-colors resize-none bg-white"
      />
      {saveState === "saving" && (
        <p className="text-[11px] text-text3 mt-0.5">Saving…</p>
      )}
      {saveState === "saved" && (
        <p className="text-[11px] text-green mt-0.5">Saved</p>
      )}
    </div>
  );
}

/* ── Empty state tutorial ────────────────────────────────────────────────── */

function EmptyStateTutorial({
  menuSlug,
  listingSlug,
  listingCity,
}: {
  menuSlug: string;
  listingSlug: string;
  listingCity: string | null;
}) {
  const menuUrl = `https://klickenya.com/m/${menuSlug}`;
  const listingUrl = listingCity
    ? `https://klickenya.com/${listingCity.toLowerCase()}/${listingSlug}`
    : `https://klickenya.com/restaurants/${listingSlug}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: do nothing on error
    }
  };

  return (
    <div className="space-y-5 py-4">
      <div className="text-center space-y-1">
        <p className="text-[16px] font-bold text-dark">No reservations yet</p>
        <p className="text-[13px] text-text3">
          Once guests start booking, they'll appear here for you to approve.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <p className="text-[12px] font-bold text-text3 uppercase tracking-wide mb-4">
          How reservations work
        </p>
        <div className="space-y-4">
          {[
            {
              icon: "🔗",
              title: "Guests book",
              desc: `From your menu page at klickenya.com/m/${menuSlug} or your Klickenya listing.`,
            },
            {
              icon: "🔔",
              title: "You get notified",
              desc: "New requests appear here within 8 seconds and we send you an email.",
            },
            {
              icon: "✅",
              title: "You approve or decline",
              desc: "Tap a request to expand it, then approve or decline. We'll send a confirmation email to the guest and generate a WhatsApp message for you.",
            },
            {
              icon: "📩",
              title: "Guest gets confirmation",
              desc: "Confirmation is sent by email. You can also open the generated WhatsApp link to message the guest directly from your phone.",
            },
          ].map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 size-7 rounded-full bg-amber/10 flex items-center justify-center text-[14px]">
                {step.icon}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-dark">
                  <span className="text-text3 mr-1">{i + 1}.</span> {step.title}
                </p>
                <p className="text-[12px] text-text3 leading-snug">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share your booking links */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <p className="text-[12px] font-bold text-text3 uppercase tracking-wide mb-3">
          Share your booking links
        </p>
        <div className="space-y-2">
          {[
            { label: "Menu page", url: menuUrl },
            { label: "Klickenya listing", url: listingUrl },
          ].map(({ label, url }) => (
            <div key={url} className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-text3 uppercase tracking-wide">{label}</p>
                <p className="text-[12px] text-dark truncate">{url}</p>
              </div>
              <CopyButton text={url} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 text-[11px] font-semibold text-amber hover:text-[#d4911c] transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function ReservationsDashboard({
  menuId,
  menuName,
  menuSlug,
  listingId,
  listingSlug,
  listingCity,
  initialReservations,
  areas: initialAreas,
  initialFetchedAt,
  tableOrdering,
  menuSettings,
}: ReservationsDashboardProps) {
  const { showToast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const reservationsRef = useRef<Reservation[]>(initialReservations);
  const lastPollIsoRef = useRef<string>(initialFetchedAt);

  // areas as mutable state so Settings tab can CRUD them
  const [areas, setAreas] = useState<RestaurantArea[]>(initialAreas);

  // Tables for the floor view. Fetched lazily on first Floor-tab open
  // (the list/calendar tabs don't need them). Includes pos_x/pos_y/area_id
  // for the floor map.
  const [floorTables, setFloorTables] = useState<Array<{
    id: string;
    table_number: string;
    capacity: number;
    pos_x: number | null;
    pos_y: number | null;
    area_id: string | null;
    /** Legacy text label; canvas falls back to it when area_id is null. */
    floor_section: string | null;
    is_active: boolean;
  }> | null>(null);
  const [floorTablesLoading, setFloorTablesLoading] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "calendar" | "floor" | "settings">("list");
  const [listFilter, setListFilter] = useState<"pending" | "approved" | "all">("pending");
  const [calendarMode, setCalendarMode] = useState<"week" | "day">("week");

  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Decline modal state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("Fully booked");
  const [declineCustomReason, setDeclineCustomReason] = useState("");
  const [declineOwnerNote, setDeclineOwnerNote] = useState("");
  const [declineSubmitting, setDeclineSubmitting] = useState(false);

  /* ── Polling — 8s interval, cleanup on unmount (pattern shared with StationDashboard.tsx) ── */
  /* ── + visibility handling per spec ── */
  useEffect(() => {
    let paused = document.visibilityState !== "visible";

    const onVisibilityChange = () => {
      paused = document.visibilityState !== "visible";
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const poll = async () => {
      if (paused) return;
      try {
        const res = await fetch(
          `/api/menu/reservations?menu_id=${menuId}&since=${encodeURIComponent(lastPollIsoRef.current)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const incoming: Reservation[] = data.reservations ?? [];

        // Detect brand-new pending reservations (IDs not in current state)
        const currentIds = new Set(reservationsRef.current.map(r => r.id));
        const brandNewPending = incoming.filter(r => !currentIds.has(r.id) && r.status === "pending");

        if (brandNewPending.length > 0) {
          playBeep();
          brandNewPending.forEach(r => {
            showToast(`New reservation request — ${r.guest_name}, party of ${r.party_size}`);
          });
        }

        // Merge: update existing rows + add any new rows
        const updatedMap = new Map(incoming.map(r => [r.id, r]));
        const brandNewAll = incoming.filter(r => !currentIds.has(r.id));
        const merged: Reservation[] = [
          ...reservationsRef.current.map(r => updatedMap.get(r.id) ?? r),
          ...brandNewAll,
        ];

        reservationsRef.current = merged;
        setReservations(merged);
        lastPollIsoRef.current = new Date().toISOString();
      } catch {
        // Network error — silently skip this poll cycle
      }
    };

    const interval = setInterval(poll, 8000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [menuId, showToast]);

  /* ── Stats (computed client-side) ─────────────────────────────────────── */
  const pendingCount = reservations.filter(r => r.status === "pending").length;
  const todayStr = getTodayNairobi();
  const todayConfirmedCovers = reservations
    .filter(r => r.status === "approved")
    .filter(r => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date(r.reserved_for)) === todayStr)
    .reduce((sum, r) => sum + r.party_size, 0);

  const { mondayMs, sundayEndMs } = getNairobiWeekBounds();
  const thisWeekCount = reservations.filter(r =>
    ["approved", "checked_in", "completed"].includes(r.status) &&
    new Date(r.reserved_for).getTime() >= mondayMs &&
    new Date(r.reserved_for).getTime() <= sundayEndMs,
  ).length;

  /* ── Row expand toggle ─────────────────────────────────────────────────── */
  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  /* ── Save owner note ───────────────────────────────────────────────────── */
  const handleSaveNote = useCallback(async (id: string, note: string) => {
    const res = await fetch(`/api/menu/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_note: note }),
    });
    if (!res.ok) throw new Error("Failed to save note");
    setReservations(prev =>
      prev.map(r => r.id === id ? { ...r, owner_note: note } : r),
    );
    reservationsRef.current = reservationsRef.current.map(r =>
      r.id === id ? { ...r, owner_note: note } : r,
    );
  }, []);

  /* ── Approve ───────────────────────────────────────────────────────────── */
  const handleApprove = useCallback(async (id: string) => {
    // Optimistic update
    const optimistic = (prev: Reservation[]) =>
      prev.map(r => r.id === id ? { ...r, status: "approved" } : r);
    setReservations(optimistic);
    reservationsRef.current = optimistic(reservationsRef.current);
    setUpdatingIds(prev => new Set([...prev, id]));

    try {
      const res = await fetch(`/api/menu/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve");

      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank");
      }
      const r = reservationsRef.current.find(r => r.id === id);
      if (data.guest_email_sent && r?.guest_email) {
        showToast(`Approved. Confirmation email sent to ${r.guest_email}.`);
      } else {
        showToast("Approved. Open WhatsApp link to send confirmation.");
      }
    } catch {
      // Revert optimistic update
      showToast("Failed to approve reservation.", "error");
      const revert = (prev: Reservation[]) =>
        prev.map(r => r.id === id ? { ...r, status: "pending" } : r);
      setReservations(revert);
      reservationsRef.current = revert(reservationsRef.current);
    } finally {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [showToast]);

  /* ── Open decline modal ────────────────────────────────────────────────── */
  const openDeclineModal = useCallback((id: string) => {
    setDeclineTargetId(id);
    setDeclineReason("Fully booked");
    setDeclineCustomReason("");
    setDeclineOwnerNote("");
    setDeclineModalOpen(true);
  }, []);

  /* ── Submit decline ────────────────────────────────────────────────────── */
  const handleDeclineSubmit = useCallback(async () => {
    if (!declineTargetId) return;
    const reason = declineReason === "Other" ? declineCustomReason.trim() : declineReason;
    if (!reason) return;

    setDeclineSubmitting(true);

    // Optimistic update
    const id = declineTargetId;
    const optimistic = (prev: Reservation[]) =>
      prev.map(r => r.id === id ? { ...r, status: "declined", decline_reason: reason } : r);
    setReservations(optimistic);
    reservationsRef.current = optimistic(reservationsRef.current);
    setUpdatingIds(prev => new Set([...prev, id]));

    try {
      const body: Record<string, string> = { status: "declined", decline_reason: reason };
      if (declineOwnerNote.trim()) body.owner_note = declineOwnerNote.trim();

      const res = await fetch(`/api/menu/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to decline");

      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank");
      }
      const r = reservationsRef.current.find(r => r.id === id);
      if (data.guest_email_sent && r?.guest_email) {
        showToast("Declined. Notification email sent.");
      } else {
        showToast("Declined. Open WhatsApp link to notify the guest.");
      }
      setDeclineModalOpen(false);
    } catch {
      showToast("Failed to decline reservation.", "error");
      const revert = (prev: Reservation[]) =>
        prev.map(r => r.id === id ? { ...r, status: "pending", decline_reason: null } : r);
      setReservations(revert);
      reservationsRef.current = revert(reservationsRef.current);
    } finally {
      setDeclineSubmitting(false);
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [declineTargetId, declineReason, declineCustomReason, declineOwnerNote, showToast]);

  /* ── Cancel ─────────────────────────────────────────────────────────────── */
  const handleCancel = useCallback(async (id: string) => {
    if (!window.confirm("Cancel this reservation? The guest will be notified.")) return;

    const optimistic = (prev: Reservation[]) =>
      prev.map(r => r.id === id ? { ...r, status: "cancelled" } : r);
    setReservations(optimistic);
    reservationsRef.current = optimistic(reservationsRef.current);
    setUpdatingIds(prev => new Set([...prev, id]));

    try {
      const res = await fetch(`/api/menu/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel");

      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank");
      }
      const r = reservationsRef.current.find(r => r.id === id);
      if (data.guest_email_sent && r?.guest_email) {
        showToast("Cancelled. Notification email sent.");
      } else {
        showToast("Cancelled. Open WhatsApp link to notify the guest.");
      }
    } catch {
      showToast("Failed to cancel reservation.", "error");
      const revert = (prev: Reservation[]) =>
        prev.map(r => r.id === id ? { ...r, status: "approved" } : r);
      setReservations(revert);
      reservationsRef.current = revert(reservationsRef.current);
    } finally {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [showToast]);

  /* ── Filtered list ─────────────────────────────────────────────────────── */
  const filteredReservations = reservations
    .filter(r => {
      if (listFilter === "pending") return r.status === "pending";
      if (listFilter === "approved") return ["approved", "checked_in", "completed"].includes(r.status);
      return true;
    })
    .sort((a, b) => new Date(a.reserved_for).getTime() - new Date(b.reserved_for).getTime());

  const isEmpty = reservations.length === 0;

  /* ── Capacity warning helper ────────────────────────────────────────────── */
  const getCapacityWarning = (r: Reservation): { pct: number; areaName: string } | null => {
    if (!r.area_id) return null;
    const area = areas.find(a => a.id === r.area_id);
    if (!area || area.capacity_total === 0) return null;
    const overlapping = overlappingApprovedCovers(r, reservations);
    const pct = (overlapping + r.party_size) / area.capacity_total;
    if (pct < CAPACITY_WARNING_THRESHOLD) return null;
    return { pct: Math.round(pct * 100), areaName: area.name };
  };

  /* ── Calendar-compatible shape ─────────────────────────────────────────── */
  const calendarReservations: CalendarReservation[] = reservations.map(r => ({
    id: r.id,
    guest_name: r.guest_name,
    guest_phone: r.guest_phone,
    guest_email: r.guest_email,
    party_size: r.party_size,
    reserved_for: r.reserved_for,
    duration_minutes: r.duration_minutes,
    area_id: r.area_id,
    area_name: r.area_name,
    area_color_hex: r.area_color_hex,
    status: r.status,
    source: r.source,
    guest_message: r.guest_message,
    owner_note: r.owner_note,
    decline_reason: r.decline_reason,
    created_at: r.created_at,
  }));

  /* ── Floor view ─────────────────────────────────────────────────────────── */
  // V1: live floor map (read-only). Canvas reuses the editor component in
  // mode="live"; tables loaded lazily on first open.
  // V2: drag-to-assign reservations onto specific tables (binds
  //     reservations.table_id) — deferred per V1 plan.

  function FloorView() {
    const activeAreas = areas.filter(a => a.is_active);

    // Lazy fetch — first time the Floor tab opens.
    useEffect(() => {
      if (floorTables !== null || floorTablesLoading) return;
      setFloorTablesLoading(true);
      fetch(`/api/menu/tables?menu_id=${menuId}`)
        .then((r) => r.json())
        .then((d) => setFloorTables(d.tables ?? []))
        .catch(() => showToast("Failed to load tables for floor map", "error"))
        .finally(() => setFloorTablesLoading(false));
    }, []);

    if (activeAreas.length === 0) {
      return (
        <p className="text-[13px] text-text3 text-center py-6">
          No seating areas configured yet. Add an area in Settings to start placing tables.
        </p>
      );
    }

    if (floorTablesLoading || floorTables === null) {
      return (
        <div className="bg-white border border-border rounded-2xl p-6 text-center text-[13px] text-text3">
          Loading floor map…
        </div>
      );
    }

    if (floorTables.length === 0) {
      return (
        <div className="bg-white border border-border rounded-2xl p-6 text-center">
          <p className="text-[14px] font-semibold text-dark">No tables yet</p>
          <p className="text-[12px] text-text3 mt-1">
            Add tables under Table ordering, then arrange them on the floor map.
          </p>
        </div>
      );
    }

    return (
      <FloorMapCanvas
        mode="live"
        areas={activeAreas.map((a) => ({
          id: a.id,
          name: a.name,
          color_hex: a.color_hex ?? null,
        }))}
        tables={floorTables}
        // V1 reservations side has no table_id binding yet, so every tile
        // shows "available". State coloring lights up in V2 once
        // reservations.table_id is wired.
        getState={() => "available"}
        onTileTap={() => {
          // V2: open a "Assign reservation" sheet here.
          showToast("Drag-to-assign reservations lands in V2.");
        }}
      />
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        {/* Pending approval */}
        <div className={`rounded-xl lg:rounded-2xl border p-4 shadow-sm ${
          pendingCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-border"
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide">
              Pending approval
            </p>
            {pendingCount > 0 && (
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <p className={`font-display text-[26px] font-bold tracking-[-0.02em] leading-none ${
            pendingCount > 0 ? "text-amber-600" : "text-dark"
          }`}>
            {pendingCount}
          </p>
        </div>

        {/* Today's confirmed covers */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-border p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-1">
            Today&apos;s covers
          </p>
          <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-green leading-none">
            {todayConfirmedCovers}
          </p>
          <p className="text-[10px] text-text3 mt-0.5">confirmed guests</p>
        </div>

        {/* This week */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-border p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-1">
            This week
          </p>
          <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-dark leading-none">
            {thisWeekCount}
          </p>
          <p className="text-[10px] text-text3 mt-0.5">reservations</p>
        </div>

        {/* No-show rate — dormant, TODO V2 */}
        {/* TODO V2: No-show rate available after V2 check-in tracking */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-border p-4 shadow-sm" title="Available after V2 check-in tracking">
          <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-1">
            No-show rate (30d)
          </p>
          <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-text3 leading-none">—</p>
          <p className="text-[10px] text-text3 mt-0.5">coming in V2</p>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {(["list", "calendar", "floor", "settings"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
              activeTab === tab
                ? "bg-dark text-white"
                : "bg-white border border-border text-text2 hover:border-dark/40"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── List view ── */}
      {activeTab === "list" && (
        <div className="space-y-3">
          {/* Sub-filter */}
          <div className="flex gap-2">
            {(["pending", "approved", "all"] as const).map(f => (
              <button
                key={f}
                onClick={() => setListFilter(f)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  listFilter === f
                    ? "bg-amber text-dark"
                    : "bg-white border border-border text-text3 hover:border-amber/40"
                }`}
              >
                {f === "pending" ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` :
                 f === "approved" ? "Approved" : "All"}
              </button>
            ))}
          </div>

          {/* Empty state tutorial */}
          {isEmpty ? (
            <EmptyStateTutorial
              menuSlug={menuSlug}
              listingSlug={listingSlug}
              listingCity={listingCity}
            />
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-10 text-[13px] text-text3">
              No {listFilter !== "all" ? listFilter : ""} reservations to show.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              {/* ── Column headers (desktop) ── */}
              <div className="hidden sm:grid grid-cols-[72px_1fr_80px_72px_auto_28px] gap-x-3 px-3 py-2 border-b border-surface bg-canvas">
                <span className="text-[10px] font-bold text-text3 uppercase tracking-wide">Time</span>
                <span className="text-[10px] font-bold text-text3 uppercase tracking-wide">Guest</span>
                <span className="text-[10px] font-bold text-text3 uppercase tracking-wide">Size / Area</span>
                <span className="text-[10px] font-bold text-text3 uppercase tracking-wide">Status</span>
                <span className="text-[10px] font-bold text-text3 uppercase tracking-wide">Actions</span>
                <span />
              </div>

              {filteredReservations.map((r, idx) => {
                const isExpanded = expandedId === r.id;
                const capacityWarning = r.status === "pending" ? getCapacityWarning(r) : null;
                const isLast = idx === filteredReservations.length - 1;

                return (
                  <div key={r.id} className={!isLast ? "border-b border-surface" : ""}>
                    {/* ── Compact row ── */}
                    <div className="flex sm:grid sm:grid-cols-[72px_1fr_80px_72px_auto_28px] items-center gap-x-3 px-3 py-2.5 hover:bg-[#FAFAF9] transition-colors">

                      {/* Time + date */}
                      <div className="shrink-0 w-[68px] sm:w-auto">
                        <p className="text-[13px] font-bold text-dark tabular-nums leading-tight">
                          {new Intl.DateTimeFormat("en-GB", {
                            hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Nairobi",
                          }).format(new Date(r.reserved_for))}
                        </p>
                        <p className="text-[10px] text-text3">
                          {new Intl.DateTimeFormat("en-KE", {
                            weekday: "short", month: "short", day: "numeric", timeZone: "Africa/Nairobi",
                          }).format(new Date(r.reserved_for))}
                        </p>
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-dark truncate">{r.guest_name}</p>
                        {r.guest_message && (
                          <p className="text-[10px] text-text3 truncate hidden sm:block">
                            "{r.guest_message.slice(0, 50)}{r.guest_message.length > 50 ? "…" : ""}"
                          </p>
                        )}
                      </div>

                      {/* Size + area (desktop) */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <span className="text-[12px] font-bold text-text2">×{r.party_size}</span>
                        <AreaChip name={r.area_name} colorHex={r.area_color_hex} />
                      </div>

                      {/* Status */}
                      <div className="shrink-0">
                        <StatusPill status={r.status} />
                      </div>

                      {/* Quick actions */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {r.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={updatingIds.has(r.id)}
                              title="Approve"
                              className="h-7 px-2.5 rounded-full bg-green text-white text-[11px] font-bold hover:bg-[#15803D] transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {updatingIds.has(r.id) ? "…" : "✓ Approve"}
                            </button>
                            <button
                              onClick={() => openDeclineModal(r.id)}
                              disabled={updatingIds.has(r.id)}
                              title="Decline"
                              className="h-7 px-2.5 rounded-full border border-[#DC2626] text-[#DC2626] text-[11px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              ✗ Decline
                            </button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <button
                            onClick={() => handleCancel(r.id)}
                            disabled={updatingIds.has(r.id)}
                            className="h-7 px-2.5 rounded-full border border-border text-text3 text-[11px] font-semibold hover:border-red-300 hover:text-[#DC2626] transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(r.id)}
                        className={`shrink-0 size-7 flex items-center justify-center rounded-full hover:bg-surface transition-colors text-text3 text-[15px] ${isExpanded ? "rotate-90" : ""}`}
                      >
                        ›
                      </button>
                    </div>

                    {/* ── Expanded detail panel ── */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3 border-t border-surface space-y-4 bg-[#FAFAF9]">

                        {/* Capacity warning (pending) */}
                        {r.status === "pending" && capacityWarning && (
                          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                            <span className="text-amber-500 shrink-0">⚠️</span>
                            <p className="text-[12px] text-amber-700">
                              Approving puts <strong>{capacityWarning.areaName}</strong> at <strong>{capacityWarning.pct}%</strong> capacity for this slot
                            </p>
                          </div>
                        )}

                        {/* Guest details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
                          <div>
                            <p className="text-[10px] font-bold text-text3 uppercase tracking-wide mb-0.5">Phone</p>
                            <a href={`tel:${r.guest_phone}`} className="text-amber font-semibold hover:underline">
                              {r.guest_phone}
                            </a>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-text3 uppercase tracking-wide mb-0.5">Email</p>
                            {r.guest_email ? (
                              <p className="text-dark font-semibold truncate">{r.guest_email}</p>
                            ) : (
                              <p className="text-amber-600 text-[11px]">⚠️ No email on file</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-text3 uppercase tracking-wide mb-0.5">Party / Area</p>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-dark">×{r.party_size}</span>
                              <AreaChip name={r.area_name} colorHex={r.area_color_hex} />
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-text3 uppercase tracking-wide mb-0.5">Date &amp; time</p>
                            <p className="text-dark">{formatFullNairobiDateTime(r.reserved_for)}</p>
                            <p className="text-[10px] text-text3">{r.duration_minutes} min hold</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-text3 uppercase tracking-wide mb-0.5">Source</p>
                            <p className="text-dark">{sourceLabel(r.source)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-text3 uppercase tracking-wide mb-0.5">Submitted</p>
                            <p className="text-dark">{relativeTime(r.created_at)}</p>
                          </div>
                        </div>

                        {/* Guest message */}
                        {r.guest_message && (
                          <blockquote className="border-l-2 border-amber pl-3 text-[12px] text-text2 italic">
                            "{r.guest_message}"
                          </blockquote>
                        )}

                        {/* Decline reason */}
                        {r.status === "declined" && r.decline_reason && (
                          <div className="bg-red-50 rounded-lg px-3 py-2 text-[12px] text-red-700">
                            <span className="font-bold">Declined:</span> {r.decline_reason}
                          </div>
                        )}

                        {/* Cancelled note */}
                        {r.status === "cancelled" && (
                          <p className="text-[12px] text-text3 italic">This reservation was cancelled.</p>
                        )}

                        {/* Owner note */}
                        <OwnerNoteField
                          reservationId={r.id}
                          initialNote={r.owner_note}
                          onSave={handleSaveNote}
                        />

                        {/* WhatsApp secondary action for approved */}
                        {r.status === "approved" && (
                          <a
                            href={buildWhatsAppUrl(r, "approved", menuName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#25D366] hover:underline"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Also send via WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Calendar view ── */}
      {activeTab === "calendar" && (
        <div className="space-y-3">
          {/* Day/Week toggle */}
          <div className="flex gap-2">
            {(["week", "day"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setCalendarMode(mode)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  calendarMode === mode
                    ? "bg-dark text-white"
                    : "bg-white border border-border text-text2 hover:border-dark/40"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            {calendarMode === "week" ? (
              <WeekView
                reservations={calendarReservations}
                menuName={menuName}
                onApprove={handleApprove}
                onDecline={openDeclineModal}
                onCancel={handleCancel}
                updatingIds={updatingIds}
              />
            ) : (
              <DayView
                reservations={calendarReservations}
                menuName={menuName}
                onApprove={handleApprove}
                onDecline={openDeclineModal}
                onCancel={handleCancel}
                updatingIds={updatingIds}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Floor view ── */}
      {activeTab === "floor" && <FloorView />}

      {/* ── Settings tab ── */}
      {activeTab === "settings" && (
        <ReservationsSettings
          menuId={menuId}
          listingId={listingId}
          listingCity={listingCity}
          initialReservationsEnabled={menuSettings.reservationsEnabled}
          initialDuration={menuSettings.duration}
          initialLeadTime={menuSettings.leadTime}
          initialMaxParty={menuSettings.maxParty}
          initialMaxAdvance={menuSettings.maxAdvance}
          initialServiceChargePct={menuSettings.serviceChargePct}
          initialAreas={areas as SettingsArea[]}
          initialWindows={menuSettings.timeWindows}
          tableOrdering={tableOrdering}
          showToast={showToast}
          onAreasChange={(updated) => setAreas(updated as RestaurantArea[])}
          onReservationsToggle={() => {/* state lives inside ReservationsSettings */}}
        />
      )}

      {/* ── Decline modal ── */}
      <Modal
        open={declineModalOpen}
        onOpenChange={(open) => { if (!declineSubmitting) setDeclineModalOpen(open); }}
        title="Decline reservation"
        description="The guest will be notified by email and WhatsApp."
      >
        <div className="space-y-4">
          {/* Reason dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-dark outline-none focus:border-amber transition-colors bg-white"
            >
              {["Fully booked", "Closed that day", "Party too large", "Other"].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Custom reason (when Other selected) */}
          {declineReason === "Other" && (
            <div>
              <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">
                Custom reason <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={declineCustomReason}
                onChange={e => setDeclineCustomReason(e.target.value)}
                placeholder="Please describe the reason…"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-dark placeholder:text-text3 outline-none focus:border-amber transition-colors bg-white"
              />
            </div>
          )}

          {/* Internal owner note */}
          <div>
            <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">
              Internal note (optional)
              <span className="text-[10px] font-normal normal-case ml-1 text-text3">
                This won't be sent to the guest
              </span>
            </label>
            <textarea
              value={declineOwnerNote}
              onChange={e => setDeclineOwnerNote(e.target.value)}
              rows={2}
              placeholder="Internal notes…"
              className="w-full border border-border rounded-xl px-3 py-2 text-[13px] text-dark placeholder:text-text3 outline-none focus:border-amber transition-colors resize-none bg-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setDeclineModalOpen(false)}
              disabled={declineSubmitting}
              className="flex-1 h-10 rounded-full border border-border text-text2 text-[13px] font-semibold hover:border-dark/40 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeclineSubmit}
              disabled={
                declineSubmitting ||
                (declineReason === "Other" && !declineCustomReason.trim())
              }
              className="flex-1 h-10 rounded-full bg-[#DC2626] text-white text-[13px] font-bold hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
            >
              {declineSubmitting ? "Declining…" : "Decline reservation"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
