"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

/* ─── Country data ──────────────────────────────── */

export interface Country {
  code: string;   // ISO 3166-1 alpha-2
  dial: string;   // e.g. "+254"
  name: string;
  flag: string;   // emoji
}

export const COUNTRIES: Country[] = [
  { code: "KE", dial: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "TZ", dial: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "UG", dial: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "RW", dial: "+250", name: "Rwanda", flag: "🇷🇼" },
  { code: "ET", dial: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "NG", dial: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", dial: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", dial: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { code: "IT", dial: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "ES", dial: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "NL", dial: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "AE", dial: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "SA", dial: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { code: "CN", dial: "+86", name: "China", flag: "🇨🇳" },
  { code: "JP", dial: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "CA", dial: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "BR", dial: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", dial: "+52", name: "Mexico", flag: "🇲🇽" },
];

/* ─── Helper: parse full phone into country + number ── */

export function parsePhone(full: string): { dial: string; number: string } {
  if (!full) return { dial: "+254", number: "" };
  // Try to match a known dial code
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (full.startsWith(c.dial)) {
      return { dial: c.dial, number: full.slice(c.dial.length) };
    }
  }
  return { dial: "+254", number: full };
}

export function formatPhone(dial: string, number: string): string {
  const cleaned = number.replace(/\D/g, "");
  return cleaned ? `${dial}${cleaned}` : "";
}

/* ─── Component ─────────────────────────────────── */

interface PhoneInputProps {
  value: string;                         // full phone: "+254712345678"
  onChange: (fullPhone: string) => void;  // returns full phone
  required?: boolean;
  className?: string;                    // applied to the wrapper
  inputClassName?: string;               // applied to the input field
  placeholder?: string;
}

export default function PhoneInput({
  value,
  onChange,
  required,
  className,
  inputClassName,
  placeholder = "712 345 678",
}: PhoneInputProps) {
  const parsed = parsePhone(value);
  const [dial, setDial] = useState(parsed.dial);
  const [number, setNumber] = useState(parsed.number);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Sync when external value changes
  useEffect(() => {
    const p = parsePhone(value);
    setDial(p.dial);
    setNumber(p.number);
  }, [value]);

  const country = COUNTRIES.find((c) => c.dial === dial) ?? COUNTRIES[0];

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  function selectCountry(c: Country) {
    setDial(c.dial);
    setOpen(false);
    setSearch("");
    onChange(formatPhone(c.dial, number));
  }

  function handleNumberChange(val: string) {
    const cleaned = val.replace(/[^\d\s]/g, "");
    setNumber(cleaned);
    onChange(formatPhone(dial, cleaned));
  }

  return (
    <div ref={ref} className={cn("relative flex items-center", className)}>
      {/* Country selector button — no border, lives inside the parent border */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 pl-3 pr-2 bg-transparent text-sm shrink-0"
      >
        <span className="text-base">{country.flag}</span>
        <span className="text-[var(--text2)] text-xs">{dial}</span>
        <svg className="w-3 h-3 text-[var(--text2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Divider */}
      <span className="w-px h-5 bg-[var(--border)] shrink-0" />

      {/* Phone number input — no border, inherits parent styling */}
      <input
        type="tel"
        value={number}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={cn(
          "flex-1 bg-transparent px-3 py-0 text-inherit placeholder:inherit border-none outline-none focus:ring-0",
          inputClassName
        )}
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          <div className="sticky top-0 bg-[var(--surface)] p-2 border-b border-[var(--border)]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--text2)]/50 focus:outline-none"
              autoFocus
            />
          </div>
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => selectCountry(c)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface2)] transition-colors",
                c.dial === dial && "bg-[var(--amber)]/10"
              )}
            >
              <span className="text-base">{c.flag}</span>
              <span className="text-[var(--text)] flex-1">{c.name}</span>
              <span className="text-[var(--text2)] text-xs">{c.dial}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
