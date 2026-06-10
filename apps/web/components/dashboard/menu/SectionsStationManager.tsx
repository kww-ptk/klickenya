"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Section {
  id: string;
  title: string;
  station: "kitchen" | "bar";
  display_order: number;
}

interface Props {
  menuId: string;
  menuName: string;
  initialSections: Section[];
}

export function SectionsStationManager({ menuName, initialSections }: Props) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showToast } = useToast();

  async function setStation(id: string, station: "kitchen" | "bar") {
    const prev = sections;
    setSections((s) => s.map((row) => (row.id === id ? { ...row, station } : row)));
    setBusyId(id);
    try {
      const res = await fetch("/api/menu/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: id, station }),
      });
      if (!res.ok) {
        setSections(prev);
        showToast("Couldn't update station", "error");
        return;
      }
      showToast(`Routed to ${station === "bar" ? "Bar" : "Kitchen"}`, "success");
    } catch {
      setSections(prev);
      showToast("Network error", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <header className="mb-6">
        <p className="text-[11px] font-bold text-text3 uppercase tracking-widest">{menuName}</p>
        <h1 className="font-display text-[22px] font-bold text-dark">Section routing</h1>
        <p className="text-[13px] text-text2 mt-1">
          Choose which station prepares each section. Food usually goes to Kitchen; drinks to Bar.
        </p>
      </header>

      <ul className="space-y-2 max-w-2xl">
        {sections.map((s) => (
          <li
            key={s.id}
            className="bg-white border border-border rounded-xl p-4 flex items-center justify-between"
          >
            <span className="font-semibold text-dark">{s.title}</span>
            <div className="inline-flex rounded-full border border-border overflow-hidden text-[12px] font-bold">
              <button
                onClick={() => setStation(s.id, "kitchen")}
                disabled={busyId === s.id}
                className={`px-3 h-[32px] transition-colors ${
                  s.station === "kitchen"
                    ? "bg-amber text-dark"
                    : "bg-white text-text2 hover:bg-[#FAF6EE]"
                }`}
              >
                🍳 Kitchen
              </button>
              <button
                onClick={() => setStation(s.id, "bar")}
                disabled={busyId === s.id}
                className={`px-3 h-[32px] transition-colors ${
                  s.station === "bar"
                    ? "bg-teal-500 text-white"
                    : "bg-white text-text2 hover:bg-[#EEF7F6]"
                }`}
              >
                🍹 Bar
              </button>
            </div>
          </li>
        ))}
        {sections.length === 0 && (
          <p className="text-[13px] text-text3">No sections yet. Create one from the menu builder.</p>
        )}
      </ul>
    </div>
  );
}
