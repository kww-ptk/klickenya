"use client";

/**
 * Step 2's mini-form. One window minimum (with weekday multiselect, open/close
 * times, optional capacity), plus party-size cap, lead time, and max-advance.
 *
 * On submit:
 *   POST /api/setup/reservations  → atomic insert + flag flip via the RPC.
 * On error 'no_active_windows' / 'invalid_window' / 'invalid_input' we surface
 * the message inline; on 200 we navigate to the next step.
 *
 * Mobile-first: all inputs are 16px font (iOS Safari zoom guard) and stack to
 * one column. Designed to fit one phone screen.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

type Window = {
  open_time: string;
  close_time: string;
  label: string;
  weekdays: number[];
  capacity: string; // string for input compat; coerced to number on submit
};

const initialWindow = (): Window => ({
  open_time: "12:00",
  close_time: "15:00",
  label: "",
  weekdays: [...ALL_DAYS],
  capacity: "",
});

export function ReservationsStepForm({
  menuId,
  nextHref,
}: {
  menuId: string;
  nextHref: string;
}) {
  const router = useRouter();
  const [maxPartySize, setMaxPartySize] = useState(8);
  const [leadHours, setLeadHours] = useState(2);
  const [maxAdvance, setMaxAdvance] = useState(30);
  const [windows, setWindows] = useState<Window[]>([initialWindow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateWindow(idx: number, patch: Partial<Window>) {
    setWindows((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  }

  function toggleWeekday(idx: number, day: number) {
    setWindows((prev) =>
      prev.map((w, i) => {
        if (i !== idx) return w;
        const has = w.weekdays.includes(day);
        return {
          ...w,
          weekdays: has ? w.weekdays.filter((d) => d !== day) : [...w.weekdays, day].sort(),
        };
      }),
    );
  }

  function addWindow() {
    setWindows((prev) => [
      ...prev,
      { ...initialWindow(), open_time: "18:30", close_time: "22:30", label: "Dinner" },
    ]);
  }

  function removeWindow(idx: number) {
    setWindows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side guards (server re-validates):
    if (windows.length === 0) {
      setError("Add at least one time window.");
      return;
    }
    for (const w of windows) {
      if (w.weekdays.length === 0) {
        setError("Each window needs at least one day selected.");
        return;
      }
      if (w.open_time >= w.close_time) {
        setError("Each window's close time must be after its open time.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/setup/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          max_party_size: maxPartySize,
          lead_time_hours: leadHours,
          max_advance_days: maxAdvance,
          windows: windows.map((w) => ({
            open_time: w.open_time,
            close_time: w.close_time,
            label: w.label.trim() || null,
            weekdays: w.weekdays,
            capacity: w.capacity ? Number(w.capacity) : null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }
      router.push(nextHref);
    } catch (err) {
      console.error(err);
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ── Caps ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <NumberRow
          label="Largest party you accept"
          suffix="guests"
          value={maxPartySize}
          min={1}
          max={50}
          onChange={setMaxPartySize}
        />
        <NumberRow
          label="Notice required"
          suffix={leadHours === 1 ? "hour" : "hours"}
          value={leadHours}
          min={0}
          max={168}
          onChange={setLeadHours}
        />
        <NumberRow
          label="Max booking lead"
          suffix={maxAdvance === 1 ? "day ahead" : "days ahead"}
          value={maxAdvance}
          min={1}
          max={365}
          onChange={setMaxAdvance}
        />
      </div>

      {/* ── Time windows ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[13px] font-bold text-[#16130C]">Time windows</p>
        {windows.map((w, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-[#E2DDD5] bg-white p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Lunch / Dinner"
                value={w.label}
                onChange={(e) => updateWindow(idx, { label: e.target.value })}
                className="flex-1 text-[16px] font-semibold text-[#16130C] placeholder:text-[#9C9485] bg-transparent border-0 focus:outline-none"
              />
              {windows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWindow(idx)}
                  className="text-[12px] text-[#9C9485] hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#9C9485]">
                Open
                <input
                  type="time"
                  required
                  value={w.open_time}
                  onChange={(e) => updateWindow(idx, { open_time: e.target.value })}
                  className="mt-1 w-full text-[16px] text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-3 py-2 focus:outline-none focus:border-[#E8A020]"
                />
              </label>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#9C9485]">
                Close
                <input
                  type="time"
                  required
                  value={w.close_time}
                  onChange={(e) => updateWindow(idx, { close_time: e.target.value })}
                  className="mt-1 w-full text-[16px] text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-3 py-2 focus:outline-none focus:border-[#E8A020]"
                />
              </label>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C9485] mb-2">
                Days
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAY_LABELS.map((day, dIdx) => {
                  const active = w.weekdays.includes(dIdx);
                  return (
                    <button
                      type="button"
                      key={dIdx}
                      onClick={() => toggleWeekday(idx, dIdx)}
                      className={
                        "min-w-[44px] h-[36px] px-3 rounded-full text-[13px] font-semibold transition-colors " +
                        (active
                          ? "bg-[#16130C] text-white"
                          : "bg-[#F4F1EC] text-[#9C9485] hover:bg-[#E2DDD5]")
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="text-[11px] font-bold uppercase tracking-wider text-[#9C9485]">
              Capacity (optional)
              <input
                type="number"
                min={1}
                placeholder="e.g. 30 covers"
                value={w.capacity}
                onChange={(e) => updateWindow(idx, { capacity: e.target.value })}
                className="mt-1 w-full text-[16px] text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-3 py-2 focus:outline-none focus:border-[#E8A020]"
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={addWindow}
          className="w-full text-[13px] font-semibold text-[#E8A020] border border-dashed border-[#E8A020]/40 rounded-xl py-3 hover:bg-[#E8A020]/[0.04] transition-colors"
        >
          + Add another window
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] disabled:opacity-50 disabled:cursor-not-allowed text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
      >
        {submitting ? "Saving…" : "Turn on reservations →"}
      </button>
    </form>
  );
}

function NumberRow({
  label,
  suffix,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-[#E2DDD5] bg-white p-3">
      <span className="text-[13px] font-semibold text-[#16130C]">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          required
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onChange(Math.max(min, Math.min(max, Math.round(n))));
          }}
          className="w-[72px] text-[16px] font-semibold text-right text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-2 py-1 focus:outline-none focus:border-[#E8A020]"
        />
        <span className="text-[12px] text-[#9C9485] min-w-[64px]">{suffix}</span>
      </span>
    </label>
  );
}
