"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LocationOption {
  /** Display name as stored in Sanity, e.g. "Watamu" or "Turtle Bay". */
  value: string;
  kind: "city" | "neighbourhood";
  /** Parent city, shown as context under a neighbourhood. */
  city?: string;
  count: number;
}

/**
 * Location combobox for the hero search.
 *
 * The old field was a bare text input. Nothing told you which places actually
 * have listings, so the obvious thing to type ("Nairobi") returned an empty
 * grid while eight properties sat in Watamu. This offers only places that have
 * stock, with counts, and still accepts free text for anything not listed yet.
 *
 * Implements the combobox pattern: arrow keys move through options, Enter picks
 * the active one, Escape closes, and the input keeps focus throughout.
 */
function LocationPicker({
  value,
  onChange,
  options,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  options: LocationOption[];
  /** Called when Enter is pressed with no option highlighted. */
  onSubmit?: () => void;
}) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const pool = q
      ? options.filter(
          (o) =>
            o.value.toLowerCase().includes(q) ||
            (o.city ?? "").toLowerCase().includes(q)
        )
      : options;
    // Cities first, then by how much stock each has.
    return [...pool]
      .sort(
        (a, b) =>
          (a.kind === b.kind ? 0 : a.kind === "city" ? -1 : 1) ||
          b.count - a.count
      )
      .slice(0, 8);
  }, [options, value]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  function pick(option: LocationOption) {
    onChange(option.value);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + delta + matches.length) % Math.max(matches.length, 1));
      return;
    }
    if (e.key === "Enter") {
      if (open && active >= 0 && matches[active]) {
        e.preventDefault();
        pick(matches[active]);
      } else {
        setOpen(false);
        onSubmit?.();
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && active >= 0 ? `${listboxId}-${active}` : undefined
          }
          autoComplete="off"
          placeholder={options.length > 0 ? "Any location" : "Town or area"}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-[16px] font-medium text-text outline-none placeholder:text-text3"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear location"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="shrink-0 text-text3 transition-colors hover:text-text"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && matches.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Locations with listings"
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 max-h-[280px] overflow-y-auto rounded-[16px] border border-border bg-white py-1.5 shadow-xl"
        >
          {matches.map((option, i) => (
            <li
              key={`${option.kind}-${option.value}`}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                // mousedown, not click: the input's blur would close the list first.
                e.preventDefault();
                pick(option);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left",
                i === active ? "bg-surface" : "bg-white"
              )}
            >
              <MapPin
                className={cn(
                  "size-3.5 shrink-0",
                  option.kind === "city" ? "text-purple2" : "text-text3"
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold text-text">
                  {option.value}
                </span>
                <span className="block truncate text-[12px] text-text3">
                  {option.kind === "city"
                    ? "Town or city"
                    : option.city
                      ? `Area in ${option.city}`
                      : "Area"}
                </span>
              </span>
              <span className="shrink-0 text-[12.5px] font-semibold text-text3">
                {option.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { LocationPicker };
