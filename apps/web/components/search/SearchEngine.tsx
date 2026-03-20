"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, MapPin, ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/hooks/useSearch";
import { SearchDropdown } from "@/components/search/SearchDropdown";
import { useCityCounts } from "@/context/CityCountsContext";
import {
  SUBCATEGORIES_BY_TYPE,
  SUBCATEGORY_LABELS,
  SUBCATEGORY_ICONS,
} from "@/lib/constants/subcategories";

/* ── Props ────────────────────────────────────────── */

interface SearchEngineProps {
  variant?: "hero" | "nav";
  className?: string;
  onExpandChange?: (expanded: boolean) => void;
}

/* ── Mega-menu data ──────────────────────────────── */

const EXPLORE_CATEGORIES = [
  { type: "stay", label: "Stays", icon: "🏠", href: "/stays" },
  { type: "experience", label: "Experiences", icon: "🎒", href: "/experiences" },
  { type: "event", label: "Events", icon: "🎟️", href: "/events" },
  { type: "service", label: "Services", icon: "⭐", href: "/services" },
  { type: "real_estate", label: "Real Estate", icon: "🏢", href: "/real-estate" },
];

/* ── City emoji map ──────────────────────────────── */

const CITY_EMOJIS: Record<string, string> = {
  Nairobi: "🇰🇪",
  Watamu: "🏖️",
  Kilifi: "🌊",
  "Diani Beach": "🏝️",
  Diani: "🏝️",
  Malindi: "🌴",
  Mombasa: "🌅",
  Lamu: "🏝️",
  Nanyuki: "🏔️",
  Nakuru: "🦩",
  Nyeri: "🌿",
  Kisumu: "🐟",
  Maasai: "🦁",
};

/* ── Location dropdown component ─────────────────── */

function LocationDropdown({
  dropRef,
  anchorRef,
  cityCounts: cities,
  selectedCity,
  onSelect,
  variant,
}: {
  dropRef: React.RefObject<HTMLDivElement | null>;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  cityCounts: Array<{ city: string; count: number; image?: string }>;
  selectedCity: string | null;
  onSelect: (city: string | null) => void;
  variant: "hero" | "nav";
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [filter, setFilter] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function update() {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setPos({ top: rect.bottom + 8, left: 12, width: window.innerWidth - 24 });
      } else {
        setPos({
          top: variant === "hero" ? rect.bottom + 8 : 68,
          left: rect.left,
          width: Math.max(rect.width, 300),
        });
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, variant]);

  // Auto-focus filter input
  useEffect(() => {
    setTimeout(() => filterRef.current?.focus(), 50);
  }, []);

  const filtered = filter.trim()
    ? cities.filter((c) => c.city.toLowerCase().includes(filter.toLowerCase()))
    : cities;

  if (!pos) return null;

  return (
    <div
      ref={dropRef}
      className="fixed rounded-[var(--radius-xl)] border border-border animate-fade-in z-[250]"
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        backgroundColor: "#ffffff",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header + filter input */}
      <div className="px-4 pt-4 pb-2 space-y-2">
        <p className="text-[13px] font-semibold text-text flex items-center gap-1.5 px-1">
          <span className="text-[15px]">📍</span>
          Where are you going?
        </p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 border border-transparent focus-within:border-amber/30 transition-colors">
          <Search className="size-3.5 text-text3 shrink-0" />
          <input
            ref={filterRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Type a city..."
            className="flex-1 text-[13px] text-text bg-transparent outline-none placeholder:text-text3 min-w-0"
          />
          {filter && (
            <button
              onClick={() => {
                setFilter("");
                filterRef.current?.focus();
              }}
              className="shrink-0"
            >
              <X className="size-3 text-text3" />
            </button>
          )}
        </div>
      </div>

      {/* City list */}
      <div className="max-h-[300px] overflow-y-auto px-2 pb-2">
        {/* Anywhere option — clears selection (hidden when filtering) */}
        {!filter.trim() && (
          <>
            <button
              onClick={() => onSelect(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                selectedCity === null
                  ? "bg-surface border-l-2 border-amber"
                  : "hover:bg-surface"
              )}
            >
              <div className="size-9 rounded-full bg-gradient-to-br from-amber/20 to-purple/20 flex items-center justify-center shrink-0">
                <span className="text-[16px]">🌍</span>
              </div>
              <span
                className={cn(
                  "text-[14px] font-semibold flex-1",
                  selectedCity === null ? "text-amber" : "text-text"
                )}
              >
                Anywhere
              </span>
            </button>
            <div className="h-px bg-border mx-3 my-1" />
          </>
        )}

        {/* City rows */}
        {filtered.length === 0 ? (
          <p className="text-[13px] text-text3 text-center py-6">
            No cities found
          </p>
        ) : (
          filtered.map((c) => {
            const isActive = selectedCity === c.city;
            return (
              <button
                key={c.city}
                onClick={() => onSelect(c.city)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                  isActive
                    ? "bg-surface border-l-2 border-amber"
                    : "hover:bg-surface"
                )}
              >
                {/* Circular image or gradient fallback */}
                {c.image ? (
                  <Image
                    src={c.image}
                    alt={c.city}
                    width={36}
                    height={36}
                    className="size-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="size-9 rounded-full bg-gradient-to-br from-[#6B2D8B] to-[#E8A020] flex items-center justify-center shrink-0">
                    <MapPin className="size-4 text-white" />
                  </div>
                )}
                <span
                  className={cn(
                    "text-[14px] font-semibold flex-1",
                    isActive ? "text-amber" : "text-text"
                  )}
                >
                  {c.city}
                </span>
                <span className="text-[11.5px] font-medium text-text3 bg-surface px-2 py-0.5 rounded-full shrink-0">
                  {c.count}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Mega menu wrapper — aligned to anchor ───────── */

function MegaMenu({
  megaDropRef,
  anchorRef,
  onMouseEnter,
  onMouseLeave,
  children,
  variant,
}: {
  megaDropRef: React.RefObject<HTMLDivElement | null>;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
  variant: "hero" | "nav";
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    function update() {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setPos({ top: rect.bottom + 8, left: 12, width: window.innerWidth - 24 });
      } else {
        // Align left edge to pill, but cap width at 720px
        const maxW = 720;
        const availRight = window.innerWidth - rect.left - 16;
        setPos({
          top: variant === "hero" ? rect.bottom + 8 : 68,
          left: rect.left,
          width: Math.min(maxW, availRight),
        });
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, variant]);

  if (!pos) return null;

  return (
    <div
      ref={megaDropRef}
      className="fixed rounded-2xl border border-border shadow-2xl p-4 sm:p-6 animate-fade-in z-[250] max-h-[70vh] overflow-y-auto"
      style={{ top: pos.top, left: pos.left, width: pos.width, backgroundColor: "#ffffff" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

/* ── SearchEngine component ──────────────────────── */

function SearchEngine({ variant = "hero", className, onExpandChange }: SearchEngineProps) {
  const router = useRouter();
  const pathname = usePathname();
  const cityCounts = useCityCounts();

  const [pillExpanded, setPillExpanded] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [heroFilter, setHeroFilter] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"search" | "where" | "what">("search");

  const pillRef = useRef<HTMLDivElement>(null);
  const pillInputRef = useRef<HTMLInputElement>(null);
  const locationDropRef = useRef<HTMLDivElement>(null);
  const megaDropRef = useRef<HTMLDivElement>(null);
  const megaTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heroFilterRef = useRef<HTMLInputElement>(null);
  const heroInlineRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const mobileFilterRef = useRef<HTMLInputElement>(null);

  const isHero = variant === "hero";
  const isNav = variant === "nav";

  // Filtered cities for hero inline dropdown
  const heroFilteredCities = heroFilter.trim()
    ? cityCounts.filter((c) => c.city.toLowerCase().includes(heroFilter.toLowerCase()))
    : cityCounts;

  // Auto-focus hero filter input when location opens
  useEffect(() => {
    if (isHero && locationOpen) {
      setTimeout(() => heroFilterRef.current?.focus(), 50);
    }
    if (!locationOpen) setHeroFilter("");
  }, [locationOpen, isHero]);

  // Search hook
  const {
    query: pillQuery,
    setQuery: setPillQuery,
    results: pillResults,
    isLoading: pillLoading,
    isOpen: pillSearchOpen,
    setIsOpen: setPillSearchOpen,
    clear: pillClear,
  } = useSearch();

  // Notify parent of expand state changes
  useEffect(() => {
    onExpandChange?.(pillExpanded);
  }, [pillExpanded, onExpandChange]);

  // Reset on route change
  useEffect(() => {
    setPillExpanded(false);
    setLocationOpen(false);
    setMegaOpen(false);
    setSelectedCity(null);
    setSelectedType(null);
    setSelectedSub(null);
    setMobileSearchOpen(false);
    pillClear();
  }, [pathname, pillClear]);

  // Lock body scroll when mobile search is open
  useEffect(() => {
    if (mobileSearchOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileSearchOpen]);

  // Auto-focus mobile input when tab changes
  useEffect(() => {
    if (!mobileSearchOpen) return;
    if (mobileTab === "search") {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    } else if (mobileTab === "where") {
      setTimeout(() => mobileFilterRef.current?.focus(), 100);
    }
  }, [mobileSearchOpen, mobileTab]);

  // Close pill when clicking outside
  useEffect(() => {
    if (!pillExpanded) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inPill = pillRef.current?.contains(target);
      const inHeroInline = heroInlineRef.current?.contains(target);
      if (!inPill && !inHeroInline) {
        setPillExpanded(false);
        pillClear();
      }
    }
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [pillExpanded, pillClear]);

  // Close location dropdown when clicking outside
  useEffect(() => {
    if (!locationOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inPill = pillRef.current?.contains(target);
      const inDrop = locationDropRef.current?.contains(target);
      if (!inPill && !inDrop) {
        setLocationOpen(false);
      }
    }
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [locationOpen]);

  // Close mega menu when clicking outside
  useEffect(() => {
    if (!megaOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inPill = pillRef.current?.contains(target);
      const inDrop = megaDropRef.current?.contains(target);
      if (!inPill && !inDrop) {
        setMegaOpen(false);
      }
    }
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [megaOpen]);

  // Close on Escape
  useEffect(() => {
    if (!pillExpanded && !locationOpen && !megaOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPillExpanded(false);
        setLocationOpen(false);
        setMegaOpen(false);
        pillClear();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [pillExpanded, locationOpen, megaOpen, pillClear]);

  // Auto-focus input when pill expands
  useEffect(() => {
    if (pillExpanded) {
      setTimeout(() => pillInputRef.current?.focus(), 50);
    }
  }, [pillExpanded]);

  // ── Handlers ──────────────────────────────────────

  const handlePillSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (pillQuery.trim()) params.set("q", pillQuery.trim());
    if (selectedCity) params.set("city", selectedCity);
    if (selectedType) params.set("type", selectedType);
    if (selectedSub) params.set("sub", selectedSub);
    const qs = params.toString();
    if (qs) {
      router.push(`/search?${qs}`);
      setPillExpanded(false);
      setMobileSearchOpen(false);
      setSelectedCity(null);
      setSelectedType(null);
      setSelectedSub(null);
      pillClear();
    }
  }, [pillQuery, selectedCity, selectedType, selectedSub, router, pillClear]);

  // Check if mobile (< 768px)
  const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

  const openMobileSearch = (tab: "search" | "where" | "what") => {
    setMobileTab(tab);
    setMobileSearchOpen(true);
  };

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    setMobileTab("search");
    setHeroFilter("");
  };

  const handleAnyTimeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHero && isMobile()) {
      openMobileSearch("search");
      return;
    }
    setLocationOpen(false);
    setMegaOpen(false);
    setPillExpanded(true);
  };

  const handleAnywhereClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHero && isMobile()) {
      openMobileSearch("where");
      return;
    }
    setMegaOpen(false);
    setPillExpanded(false);
    pillClear();
    setLocationOpen(!locationOpen);
  };

  const handleAnyTypeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHero && isMobile()) {
      openMobileSearch("what");
      return;
    }
    setLocationOpen(false);
    setPillExpanded(false);
    pillClear();
    setMegaOpen(!megaOpen);
  };

  const handleMegaEnter = () => {
    clearTimeout(megaTimeout.current);
    setMegaOpen(true);
  };
  const handleMegaLeave = () => {
    megaTimeout.current = setTimeout(() => setMegaOpen(false), 200);
  };

  // Auto-navigate when both city and type are selected
  const autoSearch = useCallback(
    (city: string | null, type: string | null, sub: string | null) => {
      if (city && type) {
        const params = new URLSearchParams();
        params.set("city", city);
        params.set("type", type);
        if (sub) params.set("sub", sub);
        setTimeout(() => {
          router.push(`/search?${params.toString()}`);
          setSelectedCity(null);
          setSelectedType(null);
          setSelectedSub(null);
        }, 200);
      }
    },
    [router]
  );

  const handleCitySelect = (city: string | null) => {
    setSelectedCity(city);
    setLocationOpen(false);
    if (city && selectedType) {
      autoSearch(city, selectedType, selectedSub);
    } else if (!selectedType) {
      setTimeout(() => setMegaOpen(true), 150);
    }
  };

  const handleTypeSelect = (type: string, sub: string, label: string) => {
    void label;
    setSelectedType(type);
    setSelectedSub(sub);
    setMegaOpen(false);
    if (selectedCity && type) {
      autoSearch(selectedCity, type, sub);
    } else if (!selectedCity) {
      setTimeout(() => setLocationOpen(true), 150);
    }
  };

  const handleCategorySelect = (type: string) => {
    setSelectedType(type);
    setSelectedSub(null);
    setMegaOpen(false);
    if (selectedCity && type) {
      autoSearch(selectedCity, type, null);
    } else if (!selectedCity) {
      setTimeout(() => setLocationOpen(true), 150);
    }
  };

  // Derive pill label for "What" section
  const typeLabel = selectedSub
    ? SUBCATEGORY_LABELS[selectedSub] ?? selectedSub
    : selectedType
      ? EXPLORE_CATEGORIES.find((c) => c.type === selectedType)?.label ?? "What"
      : null;

  // ── Variant-specific classes ──────────────────────

  const textSize = isHero ? "text-[14px]" : "text-[13px]";
  const amberSize = isHero ? "size-10" : "size-8";
  const amberIconSize = isHero ? "size-4" : "size-3.5";

  // ── Mega menu content (shared) ────────────────────

  const megaMenuContent = (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-5">
      {EXPLORE_CATEGORIES.map((cat) => {
        const subs = SUBCATEGORIES_BY_TYPE[cat.type] ?? [];
        const isCatActive = selectedType === cat.type && !selectedSub;
        return (
          <div key={cat.type}>
            <button
              onClick={() => handleCategorySelect(cat.type)}
              className="flex items-center gap-1.5 mb-3 group text-left"
            >
              <span className="text-[18px]">{cat.icon}</span>
              <span className={cn(
                "text-[13px] font-bold transition-colors",
                isCatActive ? "text-amber" : "text-dark group-hover:text-amber"
              )}>
                {cat.label}
              </span>
            </button>
            <div className="flex flex-col gap-1">
              {subs.map((sub) => {
                const isSubActive = selectedType === cat.type && selectedSub === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => handleTypeSelect(cat.type, sub, SUBCATEGORY_LABELS[sub] ?? sub)}
                    className={cn(
                      "text-[12px] transition-colors py-0.5 flex items-center gap-1.5 text-left",
                      isSubActive ? "text-amber font-semibold" : "text-text2 hover:text-amber"
                    )}
                  >
                    <span className="text-[12px]">
                      {SUBCATEGORY_ICONS[sub]}
                    </span>
                    {SUBCATEGORY_LABELS[sub] ?? sub}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div
        ref={pillRef}
        className={cn(
          "flex relative items-center bg-white border border-border rounded-full shadow-sm transition-all duration-200 ease-out min-w-0",
          // Expanded state
          pillExpanded
            ? isHero
              ? "max-w-[600px] shadow-lg py-2.5 pl-[22px] pr-2 mx-auto"
              : "flex-1 max-w-[560px] py-2 pl-[18px] pr-2 shadow-md"
            : isHero
              ? "max-w-[540px] cursor-pointer hover:shadow-md py-2.5 pl-[22px] pr-2 mx-auto"
              : "flex-1 lg:max-w-[400px] cursor-pointer hover:shadow-md",
          className
        )}
        onClick={() => {
          // On mobile hero, tapping anywhere on the pill opens fullscreen search
          if (isHero && isMobile()) {
            openMobileSearch("search");
          }
        }}
      >
        {pillExpanded ? (
          /* ── Expanded: input mode ─────────── */
          <div className={cn(
            "flex items-center flex-1",
            isNav && "py-2 pl-[18px] pr-2"
          )}>
            {isHero && <Search className="size-4 text-text3 shrink-0 mr-2.5" />}
            <input
              ref={pillInputRef}
              type="text"
              value={pillQuery}
              onChange={(e) => setPillQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePillSearch();
              }}
              placeholder="Search stays, experiences, destinations..."
              className={cn(
                "flex-1 text-text bg-transparent outline-none placeholder:text-text3 min-w-0",
                textSize
              )}
            />
            {pillQuery && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  pillClear();
                  pillInputRef.current?.focus();
                }}
                className="shrink-0 size-5 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors mr-1"
              >
                <X className="size-3 text-text3" />
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Mobile + Tablet: compact single-line trigger (nav only) ─── */}
            {isNav && (
              <button
                className="flex lg:hidden items-center gap-2 flex-1 py-2.5 pl-4 text-left min-w-0"
                onClick={handleAnyTimeClick}
              >
                <Search className="size-3.5 text-text3 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className={cn("font-semibold text-text leading-tight", textSize)}>
                    Try Me...
                  </span>
                  <span className="text-[11px] text-text3 leading-tight truncate">
                    {selectedCity && typeLabel
                      ? `${selectedCity} · ${typeLabel}`
                      : selectedCity
                        ? `${selectedCity} · Any type`
                        : typeLabel
                          ? `Anywhere · ${typeLabel}`
                          : "Where · What"}
                  </span>
                </div>
              </button>
            )}

            {/* ── Desktop 3-column layout ─── */}
            <div className={cn(
              "flex flex-1 items-center min-w-0",
              isNav ? "hidden lg:flex" : "flex"
            )}>
              {/* 1. Try Me... — opens search input */}
              <button
                className={cn(
                  "flex-1 flex items-center gap-1.5 py-2.5 pr-2 font-semibold text-text2 hover:text-text hover:bg-surface/60 transition-colors whitespace-nowrap rounded-l-full",
                  textSize,
                  isHero ? "pl-0" : "pl-4"
                )}
                onClick={handleAnyTimeClick}
              >
                {isNav && <Search className="size-3 text-text3 shrink-0" />}
                <span>Try Me...</span>
              </button>
              <span className="w-px h-4 bg-border shrink-0" />
              {/* 2. Where — opens location picker */}
              <button
                className={cn(
                  "flex items-center gap-1.5 py-2.5 px-3 font-semibold transition-colors whitespace-nowrap shrink-0 truncate max-w-[140px]",
                  textSize,
                  selectedCity
                    ? "text-text bg-amber/5"
                    : locationOpen
                      ? "text-amber bg-amber/5"
                      : "text-text2 hover:text-text hover:bg-surface/60"
                )}
                onClick={handleAnywhereClick}
              >
                <span className="truncate">{selectedCity ?? "Where"}</span>
              </button>
              <span className="w-px h-4 bg-border shrink-0" />
              {/* 3. What — opens mega menu */}
              <button
                className={cn(
                  "flex items-center gap-1.5 py-2.5 px-3 font-semibold transition-colors whitespace-nowrap shrink-0 truncate max-w-[140px] rounded-r-full",
                  textSize,
                  typeLabel
                    ? "text-text bg-amber/5"
                    : megaOpen
                      ? "text-amber bg-amber/5"
                      : "text-text2 hover:text-text hover:bg-surface/60"
                )}
                onClick={handleAnyTypeClick}
              >
                <span className="truncate">{typeLabel ?? "What"}</span>
              </button>
            </div>
          </>
        )}

        {/* Amber search button — always visible */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (pillExpanded && (pillQuery.trim() || selectedCity || selectedType)) {
              handlePillSearch();
            } else if (!pillExpanded && (selectedCity || selectedType)) {
              handlePillSearch();
            } else if (!pillExpanded) {
              setLocationOpen(false);
              setPillExpanded(true);
            }
          }}
          className={cn(
            "rounded-full bg-amber flex items-center justify-center shrink-0 hover:shadow-md transition-shadow",
            amberSize,
            isHero ? "ml-2.5" : "mx-1.5"
          )}
        >
          <Search className={cn("text-white", amberIconSize)} strokeWidth={2.5} />
        </button>

        {/* Search dropdown — nav only (fixed position) */}
        {isNav && pillExpanded && (
          <SearchDropdown
            results={pillResults}
            isLoading={pillLoading}
            isOpen={pillSearchOpen}
            query={pillQuery}
            onClose={() => setPillSearchOpen(false)}
          />
        )}
      </div>

      {/* ── Hero: inline dropdowns (push content down) ── */}
      {isHero && (locationOpen || megaOpen || (pillExpanded && pillSearchOpen)) && (
        <div ref={heroInlineRef} className="w-full max-w-[600px] mx-auto mt-3 animate-search-dropdown">
          {locationOpen && (
            <div
              ref={locationDropRef}
              className="rounded-[var(--radius-xl)] border border-border bg-white shadow-lg overflow-hidden"
            >
              {/* Header + filter input */}
              <div className="px-4 pt-4 pb-2 space-y-2">
                <p className="text-[13px] font-semibold text-text flex items-center gap-1.5 px-1">
                  <span className="text-[15px]">📍</span>
                  Where are you going?
                </p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 border border-transparent focus-within:border-amber/30 transition-colors">
                  <Search className="size-3.5 text-text3 shrink-0" />
                  <input
                    ref={heroFilterRef}
                    type="text"
                    value={heroFilter}
                    onChange={(e) => setHeroFilter(e.target.value)}
                    placeholder="Type a city..."
                    className="flex-1 text-[13px] text-text bg-transparent outline-none placeholder:text-text3 min-w-0"
                  />
                  {heroFilter && (
                    <button onClick={() => { setHeroFilter(""); heroFilterRef.current?.focus(); }} className="shrink-0">
                      <X className="size-3 text-text3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[260px] overflow-y-auto px-2 pb-2">
                {!heroFilter.trim() && (
                  <>
                    <button
                      onClick={() => handleCitySelect(null)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                        selectedCity === null ? "bg-surface border-l-2 border-amber" : "hover:bg-surface"
                      )}
                    >
                      <div className="size-9 rounded-full bg-gradient-to-br from-amber/20 to-purple/20 flex items-center justify-center shrink-0">
                        <span className="text-[16px]">🌍</span>
                      </div>
                      <span className={cn("text-[14px] font-semibold flex-1", selectedCity === null ? "text-amber" : "text-text")}>
                        Anywhere
                      </span>
                    </button>
                    <div className="h-px bg-border mx-3 my-1" />
                  </>
                )}
                {heroFilteredCities.length === 0 ? (
                  <p className="text-[13px] text-text3 text-center py-6">No cities found</p>
                ) : (
                  heroFilteredCities.map((c) => {
                    const isActive = selectedCity === c.city;
                    return (
                      <button
                        key={c.city}
                        onClick={() => handleCitySelect(c.city)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                          isActive ? "bg-surface border-l-2 border-amber" : "hover:bg-surface"
                        )}
                      >
                        {c.image ? (
                          <Image src={c.image} alt={c.city} width={36} height={36} className="size-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="size-9 rounded-full bg-gradient-to-br from-[#6B2D8B] to-[#E8A020] flex items-center justify-center shrink-0">
                            <MapPin className="size-4 text-white" />
                          </div>
                        )}
                        <span className={cn("text-[14px] font-semibold flex-1", isActive ? "text-amber" : "text-text")}>{c.city}</span>
                        <span className="text-[11.5px] font-medium text-text3 bg-surface px-2 py-0.5 rounded-full shrink-0">{c.count}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {megaOpen && (
            <div
              ref={megaDropRef}
              className="rounded-2xl border border-border bg-white shadow-lg p-4 sm:p-6 max-h-[70vh] overflow-y-auto"
            >
              {megaMenuContent}
            </div>
          )}

          {pillExpanded && pillSearchOpen && (
            <div className="rounded-[20px] border border-border bg-white shadow-lg overflow-hidden">
              <SearchDropdown
                results={pillResults}
                isLoading={pillLoading}
                isOpen={pillSearchOpen}
                query={pillQuery}
                onClose={() => setPillSearchOpen(false)}
                inline
              />
            </div>
          )}
        </div>
      )}

      {/* ── Nav: fixed-position dropdowns (overlay) ── */}
      {isNav && locationOpen && (
        <LocationDropdown
          dropRef={locationDropRef}
          anchorRef={pillRef}
          cityCounts={cityCounts}
          selectedCity={selectedCity}
          onSelect={handleCitySelect}
          variant={variant}
        />
      )}

      {isNav && megaOpen && (
        <MegaMenu
          megaDropRef={megaDropRef}
          anchorRef={pillRef}
          onMouseEnter={handleMegaEnter}
          onMouseLeave={handleMegaLeave}
          variant={variant}
        >
          {megaMenuContent}
        </MegaMenu>
      )}

      {/* ── Mobile full-page search overlay (portal to body) ──────────── */}
      {mobileSearchOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[300] bg-white flex flex-col animate-mobile-search">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <button
              onClick={closeMobileSearch}
              className="size-9 rounded-full bg-surface flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="size-4 text-text" />
            </button>

            {/* Search input (always visible in header) */}
            <div className="flex-1 flex items-center gap-2 bg-surface rounded-full px-4 py-2.5">
              <Search className="size-4 text-text3 shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                value={pillQuery}
                onChange={(e) => {
                  setPillQuery(e.target.value);
                  setMobileTab("search");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePillSearch();
                }}
                placeholder="Search stays, experiences..."
                className="flex-1 text-[15px] text-text bg-transparent outline-none placeholder:text-text3 min-w-0"
              />
              {pillQuery && (
                <button
                  onClick={() => {
                    pillClear();
                    mobileInputRef.current?.focus();
                  }}
                  className="shrink-0"
                >
                  <X className="size-4 text-text3" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {(
              [
                { id: "search", label: "Search", icon: "🔍" },
                { id: "where", label: selectedCity ?? "Where", icon: "📍" },
                { id: "what", label: typeLabel ?? "What", icon: "✨" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={cn(
                  "flex-1 py-3 text-[13px] font-semibold text-center transition-colors border-b-2",
                  mobileTab === tab.id
                    ? "text-amber border-amber"
                    : "text-text3 border-transparent"
                )}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {/* ── Search tab ── */}
            {mobileTab === "search" && (
              <div>
                {/* Active filters */}
                {(selectedCity || typeLabel) && (
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    {selectedCity && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber/10 text-amber text-[12px] font-semibold">
                        📍 {selectedCity}
                        <button onClick={() => setSelectedCity(null)}>
                          <X className="size-3" />
                        </button>
                      </span>
                    )}
                    {typeLabel && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-dim text-purple text-[12px] font-semibold">
                        ✨ {typeLabel}
                        <button onClick={() => { setSelectedType(null); setSelectedSub(null); }}>
                          <X className="size-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}

                {/* Search results */}
                {pillQuery.length >= 2 ? (
                  <SearchDropdown
                    results={pillResults}
                    isLoading={pillLoading}
                    isOpen={pillSearchOpen}
                    query={pillQuery}
                    onClose={() => {
                      setPillSearchOpen(false);
                      closeMobileSearch();
                    }}
                    inline
                  />
                ) : (
                  /* Quick actions when no query */
                  <div className="p-4 space-y-3">
                    <p className="text-[12px] font-semibold text-text3 uppercase tracking-wider px-1">
                      Popular searches
                    </p>
                    {["Nairobi", "Safari", "Villa", "Diani Beach", "Watamu", "Kilifi"].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setPillQuery(s);
                          setMobileTab("search");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface transition-colors text-left"
                      >
                        <div className="size-9 rounded-full bg-surface flex items-center justify-center shrink-0">
                          <Search className="size-4 text-text3" />
                        </div>
                        <span className="text-[14px] font-medium text-text">{s}</span>
                        <ChevronRight className="size-4 text-text3 ml-auto shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Where tab ── */}
            {mobileTab === "where" && (
              <div>
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface border border-transparent focus-within:border-amber/30 transition-colors">
                    <Search className="size-3.5 text-text3 shrink-0" />
                    <input
                      ref={mobileFilterRef}
                      type="text"
                      value={heroFilter}
                      onChange={(e) => setHeroFilter(e.target.value)}
                      placeholder="Search cities..."
                      className="flex-1 text-[14px] text-text bg-transparent outline-none placeholder:text-text3 min-w-0"
                    />
                    {heroFilter && (
                      <button onClick={() => { setHeroFilter(""); mobileFilterRef.current?.focus(); }}>
                        <X className="size-3.5 text-text3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-2 pb-4">
                  {/* Anywhere */}
                  {!heroFilter.trim() && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedCity(null);
                          if (!selectedType) setMobileTab("what");
                          else { setMobileTab("search"); handlePillSearch(); }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left",
                          selectedCity === null ? "bg-amber/5 border-l-2 border-amber" : "hover:bg-surface"
                        )}
                      >
                        <div className="size-10 rounded-full bg-gradient-to-br from-amber/20 to-purple/20 flex items-center justify-center shrink-0">
                          <span className="text-[18px]">🌍</span>
                        </div>
                        <div>
                          <span className={cn("text-[15px] font-semibold", selectedCity === null ? "text-amber" : "text-text")}>
                            Anywhere
                          </span>
                          <p className="text-[12px] text-text3">All locations in Kenya</p>
                        </div>
                      </button>
                      <div className="h-px bg-border mx-3 my-1" />
                    </>
                  )}

                  {/* Cities */}
                  {heroFilteredCities.length === 0 ? (
                    <p className="text-[14px] text-text3 text-center py-8">No cities found</p>
                  ) : (
                    heroFilteredCities.map((c) => {
                      const isActive = selectedCity === c.city;
                      return (
                        <button
                          key={c.city}
                          onClick={() => {
                            setSelectedCity(c.city);
                            setHeroFilter("");
                            if (!selectedType) setMobileTab("what");
                            else { setMobileTab("search"); }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left",
                            isActive ? "bg-amber/5 border-l-2 border-amber" : "hover:bg-surface"
                          )}
                        >
                          {c.image ? (
                            <Image src={c.image} alt={c.city} width={40} height={40} className="size-10 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="size-10 rounded-full bg-gradient-to-br from-[#6B2D8B] to-[#E8A020] flex items-center justify-center shrink-0">
                              <MapPin className="size-4 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={cn("text-[15px] font-semibold block", isActive ? "text-amber" : "text-text")}>
                              {c.city}
                            </span>
                            <span className="text-[12px] text-text3">{c.count} listings</span>
                          </div>
                          <ChevronRight className="size-4 text-text3 shrink-0" />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── What tab ── */}
            {mobileTab === "what" && (
              <div className="p-4 space-y-4">
                {EXPLORE_CATEGORIES.map((cat) => {
                  const subs = SUBCATEGORIES_BY_TYPE[cat.type] ?? [];
                  const isCatActive = selectedType === cat.type && !selectedSub;
                  return (
                    <div key={cat.type}>
                      <button
                        onClick={() => {
                          setSelectedType(cat.type);
                          setSelectedSub(null);
                          if (!selectedCity) setMobileTab("where");
                          else setMobileTab("search");
                        }}
                        className={cn(
                          "flex items-center gap-2 w-full text-left py-2 px-2 rounded-xl transition-colors",
                          isCatActive ? "bg-amber/8" : "hover:bg-surface"
                        )}
                      >
                        <span className="text-[20px]">{cat.icon}</span>
                        <span className={cn(
                          "text-[15px] font-bold",
                          isCatActive ? "text-amber" : "text-text"
                        )}>
                          {cat.label}
                        </span>
                        <ChevronRight className="size-4 text-text3 ml-auto" />
                      </button>
                      <div className="flex flex-wrap gap-1.5 pl-9 pr-2 pb-2 pt-1">
                        {subs.map((sub) => {
                          const isSubActive = selectedType === cat.type && selectedSub === sub;
                          return (
                            <button
                              key={sub}
                              onClick={() => {
                                setSelectedType(cat.type);
                                setSelectedSub(sub);
                                if (!selectedCity) setMobileTab("where");
                                else setMobileTab("search");
                              }}
                              className={cn(
                                "text-[12px] px-3 py-1.5 rounded-full border transition-colors",
                                isSubActive
                                  ? "bg-amber/10 border-amber/30 text-amber font-semibold"
                                  : "bg-surface border-transparent text-text2 hover:border-amber/20 hover:text-amber"
                              )}
                            >
                              {SUBCATEGORY_ICONS[sub]} {SUBCATEGORY_LABELS[sub] ?? sub}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          {(selectedCity || selectedType || pillQuery.trim()) && (
            <div className="shrink-0 px-4 py-3 border-t border-border bg-white pb-[calc(12px+env(safe-area-inset-bottom))]">
              <button
                onClick={handlePillSearch}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-amber text-dark font-semibold text-[15px] shadow-[0_4px_14px_rgba(232,160,32,0.35)] active:scale-[0.98] transition-transform"
              >
                <Search className="size-4" strokeWidth={2.5} />
                Search
                {selectedCity && ` in ${selectedCity}`}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export { SearchEngine, EXPLORE_CATEGORIES };
