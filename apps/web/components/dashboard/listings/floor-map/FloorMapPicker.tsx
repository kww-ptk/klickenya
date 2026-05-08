"use client";

import { useMemo } from "react";

/* ── Types ─────────────────────────────────────────── */

export interface PickerArea {
  id:         string;
  name:       string;
  /** Tinted accent for the active pill — comes from restaurant_areas.color_hex. */
  color_hex:  string | null;
  /** Optional badge — e.g. "12 / 18 free" or "3 reservations". */
  badge?:     string;
}

interface Props {
  areas:     PickerArea[];
  selectedId: string | null;
  onSelect:  (id: string) => void;
}

/* ── Component ─────────────────────────────────────── */
//
// Horizontal pill row at the top of the floor map. Per-area colour comes
// from restaurant_areas.color_hex (already a live field). Falls back to
// the Klickenya orange when an area hasn't picked one.

export function FloorMapPicker({ areas, selectedId, onSelect }: Props) {
  const ordered = useMemo(
    () => [...areas].sort((a, b) => a.name.localeCompare(b.name)),
    [areas],
  );

  if (ordered.length <= 1) {
    // Single area or none — no point rendering a picker.
    return null;
  }

  return (
    <div className="-mx-1 overflow-x-auto">
      <div className="flex gap-1.5 px-1 min-w-max">
        {ordered.map((a) => {
          const active = a.id === selectedId;
          const accent = a.color_hex ?? "#E8A020";
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={[
                "h-10 px-4 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors",
                "border",
                active
                  ? "text-white"
                  : "bg-white text-[#5E5848] border-[#E2DDD5] hover:border-[#9C9485]",
              ].join(" ")}
              style={
                active
                  ? { backgroundColor: accent, borderColor: accent }
                  : undefined
              }
            >
              {a.name}
              {a.badge && (
                <span
                  className={`ml-1.5 text-[11px] ${active ? "opacity-80" : "text-[#9C9485]"}`}
                >
                  {a.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
