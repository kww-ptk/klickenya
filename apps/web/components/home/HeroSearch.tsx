"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  Minus,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/hooks/useSearch";
import { SearchDropdown } from "@/components/search/SearchDropdown";

/* ── Tab config ──────────────────────────────────── */

type Tab = (typeof TABS)[number];

const TABS = [
  "Stays",
  "Experiences",
  "Events",
  "Services",
  "Real Estate",
] as const;

const TAB_TYPE_MAP: Record<Tab, string> = {
  Stays: "stay",
  Experiences: "experience",
  Events: "event",
  Services: "service",
  "Real Estate": "real_estate",
};

const TAB_PATH_MAP: Record<Tab, string> = {
  Stays: "/stays",
  Experiences: "/experiences",
  Events: "/events",
  Services: "/services",
  "Real Estate": "/real-estate",
};

/* Field labels change per tab */
interface FieldConfig {
  f1: string;
  f2: string;
  f3: string;
  f4: string;
  f2Placeholder: string;
  f3Placeholder: string;
  f4Placeholder: string;
  showF3: boolean;
  showF4: boolean;
}

const TAB_FIELDS: Record<Tab, FieldConfig> = {
  Stays: {
    f1: "Location",
    f2: "Check in",
    f3: "Check out",
    f4: "Guests",
    f2Placeholder: "Add date",
    f3Placeholder: "Add date",
    f4Placeholder: "Add guests",
    showF3: true,
    showF4: true,
  },
  Experiences: {
    f1: "Location",
    f2: "Date",
    f3: "Duration",
    f4: "Group size",
    f2Placeholder: "Add date",
    f3Placeholder: "Any duration",
    f4Placeholder: "Add group size",
    showF3: true,
    showF4: true,
  },
  Events: {
    f1: "Location",
    f2: "Date",
    f3: "",
    f4: "Tickets",
    f2Placeholder: "Add date",
    f3Placeholder: "",
    f4Placeholder: "How many?",
    showF3: false,
    showF4: true,
  },
  Services: {
    f1: "Location",
    f2: "Date",
    f3: "",
    f4: "",
    f2Placeholder: "Add date",
    f3Placeholder: "",
    f4Placeholder: "",
    showF3: false,
    showF4: false,
  },
  "Real Estate": {
    f1: "Location",
    f2: "Budget",
    f3: "Type",
    f4: "",
    f2Placeholder: "Any budget",
    f3Placeholder: "Any type",
    f4Placeholder: "",
    showF3: true,
    showF4: false,
  },
};

/* ── Helpers ──────────────────────────────────────── */

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatGuests(adults: number, children: number): string {
  const total = adults + children;
  if (children === 0) return `${total} guest${total !== 1 ? "s" : ""}`;
  return `${adults} adult${adults !== 1 ? "s" : ""}, ${children} child${children !== 1 ? "ren" : ""}`;
}

/* ── Simple Calendar ─────────────────────────────── */

function MiniCalendar({
  selected,
  onSelect,
  onClose,
}: {
  selected?: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  return (
    <div
      className="absolute top-[calc(100%+8px)] left-0 z-[300] bg-white border border-border rounded-2xl shadow-lg p-4 w-[280px] animate-search-dropdown"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="size-7 rounded-full hover:bg-surface flex items-center justify-center text-text2"
        >
          ←
        </button>
        <span className="text-[13px] font-semibold text-text">
          {viewMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          onClick={nextMonth}
          className="size-7 rounded-full hover:bg-surface flex items-center justify-center text-text2"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {dayNames.map((d) => (
          <span
            key={d}
            className="text-[10px] font-bold text-text3 uppercase py-1"
          >
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null)
            return <span key={`empty-${i}`} className="h-8" />;
          const date = new Date(year, month, day);
          const isPast = date < today;
          const isSelected =
            selected &&
            date.getDate() === selected.getDate() &&
            date.getMonth() === selected.getMonth() &&
            date.getFullYear() === selected.getFullYear();
          const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

          return (
            <button
              key={day}
              disabled={isPast}
              onClick={() => {
                onSelect(date);
                onClose();
              }}
              className={cn(
                "h-8 rounded-full text-[12.5px] font-medium transition-colors",
                isPast && "text-text3/40 cursor-not-allowed",
                !isPast && !isSelected && "hover:bg-surface text-text2",
                isSelected && "bg-amber text-white",
                isToday && !isSelected && "ring-1 ring-amber/40"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Guest Counter ───────────────────────────────── */

function GuestsDropdown({
  adults,
  children: childCount,
  onAdultsChange,
  onChildrenChange,
  onClose,
}: {
  adults: number;
  children: number;
  onAdultsChange: (n: number) => void;
  onChildrenChange: (n: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute top-[calc(100%+8px)] right-0 z-[300] bg-white border border-border rounded-2xl shadow-lg p-5 w-[240px] animate-search-dropdown"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Adults */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-semibold text-text">Adults</p>
          <p className="text-[11px] text-text3">Age 13+</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onAdultsChange(Math.max(1, adults - 1))}
            disabled={adults <= 1}
            className="size-7 rounded-full border border-border flex items-center justify-center text-text2 hover:border-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="size-3" />
          </button>
          <span className="text-[14px] font-semibold text-text w-4 text-center">
            {adults}
          </span>
          <button
            onClick={() => onAdultsChange(Math.min(16, adults + 1))}
            className="size-7 rounded-full border border-border flex items-center justify-center text-text2 hover:border-dark transition-colors"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-text">Children</p>
          <p className="text-[11px] text-text3">Ages 2–12</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onChildrenChange(Math.max(0, childCount - 1))}
            disabled={childCount <= 0}
            className="size-7 rounded-full border border-border flex items-center justify-center text-text2 hover:border-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="size-3" />
          </button>
          <span className="text-[14px] font-semibold text-text w-4 text-center">
            {childCount}
          </span>
          <button
            onClick={() => onChildrenChange(Math.min(10, childCount + 1))}
            className="size-7 rounded-full border border-border flex items-center justify-center text-text2 hover:border-dark transition-colors"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>

      <button
        onClick={onClose}
        className="mt-4 w-full py-2 rounded-full bg-dark text-white text-[12.5px] font-semibold hover:bg-dark/90 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

/* ── Main HeroSearch ─────────────────────────────── */

function HeroSearch() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Stays");
  const [checkin, setCheckin] = useState<Date | undefined>();
  const [checkout, setCheckout] = useState<Date | undefined>();
  const [adults, setAdults] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [navigating, setNavigating] = useState(false);

  // Popover state
  const [openPopover, setOpenPopover] = useState<
    "checkin" | "checkout" | "guests" | null
  >(null);

  // Search hook for location
  const { query, setQuery, results, isLoading, isOpen, setIsOpen, clear } =
    useSearch();

  const locationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fields = TAB_FIELDS[activeTab];

  // Close popovers when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (locationRef.current && !locationRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [setIsOpen]);

  // Handle search submit
  const handleSearch = useCallback(() => {
    setNavigating(true);
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (checkin)
      params.set("checkin", checkin.toISOString().split("T")[0]);
    if (checkout)
      params.set("checkout", checkout.toISOString().split("T")[0]);
    const totalGuests = adults + childCount;
    if (totalGuests > 1) params.set("guests", String(totalGuests));

    const base = query
      ? "/search"
      : TAB_PATH_MAP[activeTab];

    const qs = params.toString();
    router.push(qs ? `${base}?${qs}` : base);

    // Reset after navigation starts
    setTimeout(() => setNavigating(false), 2000);
  }, [query, checkin, checkout, adults, childCount, activeTab, router]);

  return (
    <div className="w-full max-w-[820px] mx-auto">
      {/* Tabs */}
      <div className="flex items-center justify-center gap-1 mb-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-full text-[13.5px] font-semibold transition-all duration-200 cursor-pointer",
              activeTab === tab
                ? "bg-purple text-white shadow-[0_2px_12px_rgba(107,45,139,0.35)]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-[32px] shadow-lg p-2 flex items-center">
        <div className="flex flex-1 items-center divide-x divide-border">
          {/* ── Field 1: Location ─────────────── */}
          <div ref={locationRef} className="relative flex-1 min-w-0">
            <div
              className="flex flex-col items-start px-5 py-2 rounded-full hover:bg-surface transition-colors cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              <span className="text-[11px] font-bold text-text uppercase tracking-[0.04em]">
                {fields.f1}
              </span>
              <div className="flex items-center gap-1 w-full">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    if (results) setIsOpen(true);
                  }}
                  placeholder="Try 'Watamu' or 'Kilifi Coast'..."
                  className="flex-1 text-[14px] text-text bg-transparent outline-none placeholder:text-text2 min-w-0"
                />
                {query && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clear();
                    }}
                    className="shrink-0 size-5 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors"
                  >
                    <X className="size-3 text-text3" />
                  </button>
                )}
              </div>
            </div>

            {/* Search dropdown */}
            <SearchDropdown
              results={results}
              isLoading={isLoading}
              isOpen={isOpen}
              query={query}
              onClose={() => setIsOpen(false)}
            />
          </div>

          {/* ── Field 2: Check in / Date / Budget ── */}
          <div className="relative hidden md:flex flex-1 min-w-0">
            <button
              onClick={() =>
                setOpenPopover(openPopover === "checkin" ? null : "checkin")
              }
              className="w-full flex flex-col items-start px-5 py-2 rounded-full hover:bg-surface transition-colors cursor-pointer min-w-0"
            >
              <span className="text-[11px] font-bold text-text uppercase tracking-[0.04em]">
                {fields.f2}
              </span>
              <span className="text-[14px] text-text2 truncate w-full text-left">
                {checkin ? formatDate(checkin) : fields.f2Placeholder}
              </span>
            </button>
            {openPopover === "checkin" && (
              <MiniCalendar
                selected={checkin}
                onSelect={(d) => {
                  setCheckin(d);
                  // Auto-open checkout if stays
                  if (activeTab === "Stays" && !checkout) {
                    setTimeout(() => setOpenPopover("checkout"), 100);
                  }
                }}
                onClose={() => setOpenPopover(null)}
              />
            )}
          </div>

          {/* ── Field 3: Check out / Duration / Type ── */}
          {fields.showF3 && (
            <div className="relative hidden md:flex flex-1 min-w-0">
              <button
                onClick={() =>
                  setOpenPopover(
                    openPopover === "checkout" ? null : "checkout"
                  )
                }
                className="w-full flex flex-col items-start px-5 py-2 rounded-full hover:bg-surface transition-colors cursor-pointer min-w-0"
              >
                <span className="text-[11px] font-bold text-text uppercase tracking-[0.04em]">
                  {fields.f3}
                </span>
                <span className="text-[14px] text-text2 truncate w-full text-left">
                  {checkout ? formatDate(checkout) : fields.f3Placeholder}
                </span>
              </button>
              {openPopover === "checkout" &&
                activeTab === "Stays" && (
                  <MiniCalendar
                    selected={checkout}
                    onSelect={setCheckout}
                    onClose={() => setOpenPopover(null)}
                  />
                )}
            </div>
          )}

          {/* ── Field 4: Guests / Group / Tickets ── */}
          {fields.showF4 && (
            <div className="relative hidden md:flex flex-1 min-w-0">
              <button
                onClick={() =>
                  setOpenPopover(
                    openPopover === "guests" ? null : "guests"
                  )
                }
                className="w-full flex flex-col items-start px-5 py-2 rounded-full hover:bg-surface transition-colors cursor-pointer min-w-0"
              >
                <span className="text-[11px] font-bold text-text uppercase tracking-[0.04em]">
                  {fields.f4}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[14px] text-text2">
                    {adults + childCount > 1
                      ? formatGuests(adults, childCount)
                      : fields.f4Placeholder}
                  </span>
                  <ChevronDown className="size-3.5 text-text3" />
                </div>
              </button>
              {openPopover === "guests" && (
                <GuestsDropdown
                  adults={adults}
                  children={childCount}
                  onAdultsChange={setAdults}
                  onChildrenChange={setChildCount}
                  onClose={() => setOpenPopover(null)}
                />
              )}
            </div>
          )}
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={navigating}
          className="shrink-0 size-12 rounded-full bg-purple2 flex items-center justify-center shadow-[0_4px_14px_rgba(139,77,171,0.35)] hover:shadow-[0_6px_20px_rgba(139,77,171,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer ml-1 disabled:opacity-70"
        >
          {navigating ? (
            <Loader2 className="size-5 text-white animate-spin" />
          ) : (
            <Search className="size-5 text-white" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}

export { HeroSearch };
