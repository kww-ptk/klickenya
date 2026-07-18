"use client";

import { useEffect, useRef, useState } from "react";

interface VenueResult {
  _id: string;
  title: string;
  type: string;
  city: string | null;
}

interface VenueListingPickerProps {
  value: { _id: string; title: string } | null;
  onChange: (v: { _id: string; title: string } | null) => void;
}

export default function VenueListingPicker({ value, onChange }: VenueListingPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VenueResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const latestQuery = useRef("");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const handle = setTimeout(async () => {
      latestQuery.current = q;
      setLoading(true);
      try {
        const res = await fetch(`/api/listings/venue-search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: VenueResult[] };
        // Ignore out-of-order responses.
        if (latestQuery.current !== q) return;
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        if (latestQuery.current !== q) return;
        setResults([]);
        setOpen(true);
      } finally {
        if (latestQuery.current === q) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[16px] text-amber-900">
          <span aria-hidden>🏠</span>
          <span>{value.title}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Clear venue listing"
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-amber-700 hover:bg-amber-200 hover:text-amber-900"
          >
            ×
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length) setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search Klickenya listings…"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-[16px] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          {loading && results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-400">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-400">No listings found</div>
          ) : (
            results.map((r) => (
              <button
                key={r._id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ _id: r._id, title: r.title });
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-amber-50"
              >
                <span className="text-[15px] text-neutral-900">{r.title}</span>
                <span className="text-xs text-neutral-500">
                  {r.type}
                  {r.city ? ` · ${r.city}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
