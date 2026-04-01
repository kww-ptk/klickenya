"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Menu, X, ChevronDown, Heart, Calendar, Mail, User, LogOut, LayoutDashboard, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { Button } from "@/components/ui/Button";
import { SearchEngine, EXPLORE_CATEGORIES } from "@/components/search/SearchEngine";
import {
  SUBCATEGORIES_BY_TYPE,
  SUBCATEGORY_LABELS,
  SUBCATEGORY_ICONS,
} from "@/lib/constants/subcategories";

interface NavProps {
  transparent?: boolean;
}

const NAV_LINKS: Array<{ href: string; label: string; badge?: string }> = [
  { href: "/events-in-kenya", label: "Events" },
  { href: "/destinations", label: "Destinations" },
  { href: "/journal", label: "Journal" },
];

/* ── Explore hover menu (link-based, independent from SearchEngine) ── */

function ExploreHoverMenu({
  dropRef,
  triggerRef,
  onMouseEnter,
  onMouseLeave,
}: {
  dropRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [pos, setPos] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    function update() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      if (vw < 768) {
        setPos({ left: 12, width: vw - 24 });
      } else {
        const maxW = Math.min(720, vw - 32);
        const dropW = maxW;
        // Center on trigger, but clamp to viewport edges
        const triggerCenter = rect.left + rect.width / 2;
        let left = triggerCenter - dropW / 2;
        if (left < 16) left = 16;
        if (left + dropW > vw - 16) left = vw - 16 - dropW;
        setPos({ left, width: dropW });
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [triggerRef]);

  if (!pos) return null;

  return (
    <div
      ref={dropRef}
      className="fixed rounded-2xl border border-border shadow-2xl p-4 sm:p-6 animate-fade-in z-[250] max-h-[70vh] overflow-y-auto"
      style={{ top: 68, left: pos.left, width: pos.width, backgroundColor: "#ffffff" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Quick navigation links */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-text hover:bg-amber/10 hover:text-amber border border-border transition-colors"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/become-a-host"
          className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-text hover:bg-amber/10 hover:text-amber border border-border transition-colors"
        >
          List your space
        </Link>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-5">
        {EXPLORE_CATEGORIES.map((cat) => {
          const subs = SUBCATEGORIES_BY_TYPE[cat.type] ?? [];
          return (
            <div key={cat.type}>
              <Link
                href={cat.href}
                className="flex items-center gap-1.5 mb-3 group"
              >
                <span className="text-[18px]">{cat.icon}</span>
                <span className="text-[13px] font-bold text-dark group-hover:text-amber transition-colors">
                  {cat.label}
                </span>
              </Link>
              <div className="flex flex-col gap-1">
                {subs.map((sub) => (
                  <Link
                    key={sub}
                    href={`${cat.href}?sub=${sub}`}
                    className="text-[12px] text-text2 hover:text-amber transition-colors py-0.5 flex items-center gap-1.5"
                  >
                    <span className="text-[12px]">
                      {SUBCATEGORY_ICONS[sub]}
                    </span>
                    {SUBCATEGORY_LABELS[sub] ?? sub}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Nav({ transparent = false }: NavProps) {
  const scrolled = useScrollPosition(50);
  const [pastHero, setPastHero] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountDropRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const exploreDropRef = useRef<HTMLDivElement>(null);
  const exploreTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = usePathname();

  // Auth state
  const [authState, setAuthState] = useState<{
    loggedIn: boolean;
    role: string | null;
  }>({ loggedIn: false, role: null });
  const [enquiryCount, setEnquiryCount] = useState(0);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAuthState({ loggedIn: false, role: null });
      return;
    }
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = profile?.role ?? "guest";
    setAuthState({ loggedIn: true, role });

    // Fetch enquiry count for hosts
    if (role === "host") {
      fetch("/api/dashboard/enquiries/count")
        .then((r) => r.json())
        .then((d) => setEnquiryCount(d.count ?? 0))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    checkAuth();
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });
    return () => subscription.unsubscribe();
  }, [checkAuth]);

  // On transparent pages (hero), delay search pill on mobile until past the hero
  useEffect(() => {
    if (!transparent) { setPastHero(true); return; }
    const handleScroll = () => {
      const vh = window.innerHeight;
      setPastHero(window.scrollY > vh * 1.2);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [transparent]);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setExploreOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // Close account dropdown on outside click or Escape
  useEffect(() => {
    if (!accountOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!accountRef.current?.contains(target) && !accountDropRef.current?.contains(target)) {
        setAccountOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [accountOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthState({ loggedIn: false, role: null });
    setAccountOpen(false);
    window.location.href = "/";
  }

  function AccountDropdownMenu() {
    const isHost = authState.role === "host";
    return (
      <div className="py-1.5">
        {/* Host section */}
        {isHost && (
          <>
            <p className="px-4 pt-1.5 pb-1 text-[10px] font-bold text-text2 uppercase tracking-wider">Hosting</p>
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-text hover:bg-surface transition-colors">
              <LayoutDashboard className="size-4 text-text2" /> Dashboard
            </Link>
            <Link href="/dashboard/listings" className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-text hover:bg-surface transition-colors">
              <Building2 className="size-4 text-text2" /> My Listings
            </Link>
            <Link href="/dashboard/enquiries" className="flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-text hover:bg-surface transition-colors">
              <span className="flex items-center gap-3">
                <Mail className="size-4 text-text2" /> Enquiries
              </span>
              {enquiryCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#E8A020] text-white text-[10px] font-bold flex items-center justify-center">
                  {enquiryCount}
                </span>
              )}
            </Link>
            <hr className="my-1.5 border-border" />
          </>
        )}
        {/* Guest section (always visible) */}
        {isHost && <p className="px-4 pt-1.5 pb-1 text-[10px] font-bold text-text2 uppercase tracking-wider">Travelling</p>}
        <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-text hover:bg-surface transition-colors">
          <User className="size-4 text-text2" /> My Profile
        </Link>
        <Link href="/profile?tab=saved" className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-text hover:bg-surface transition-colors">
          <Heart className="size-4 text-text2" /> Saved
        </Link>
        <Link href="/profile?tab=events" className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-text hover:bg-surface transition-colors">
          <Calendar className="size-4 text-text2" /> Events
        </Link>
        {!isHost && (
          <Link href="/profile?tab=enquiries" className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-text hover:bg-surface transition-colors">
            <Mail className="size-4 text-text2" /> Enquiries
          </Link>
        )}
        <hr className="my-1.5 border-border" />
        <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors w-full text-left">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    );
  }

  // Close explore menu when clicking outside
  useEffect(() => {
    if (!exploreOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inTrigger = exploreRef.current?.contains(target);
      const inDrop = exploreDropRef.current?.contains(target);
      if (!inTrigger && !inDrop) {
        setExploreOpen(false);
      }
    }
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [exploreOpen]);

  const solid = !transparent || scrolled || mobileOpen;

  const handleExploreEnter = () => {
    clearTimeout(exploreTimeout.current);
    setExploreOpen(true);
  };
  const handleExploreLeave = () => {
    exploreTimeout.current = setTimeout(() => setExploreOpen(false), 200);
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-[200] h-[68px] flex items-center px-5 md:px-10 transition-all duration-300 border-b",
          solid
            ? "bg-white/96 backdrop-blur-[24px] backdrop-saturate-[180%] border-border shadow-[0_1px_0_var(--color-border)]"
            : "bg-transparent border-transparent"
        )}
      >
        <div className="w-full flex items-center justify-between gap-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo-profile.jpg"
              alt="Klickenya"
              width={36}
              height={36}
              className="size-9 rounded-[10px] object-cover shrink-0"
            />
            <span
              className={cn(
                "hidden sm:inline text-[17px] font-bold tracking-[-0.03em]",
                solid ? "text-text" : "text-white"
              )}
            >
              Klic<span className="text-amber">K</span>enya
            </span>
          </Link>

          {/* Search pill — SearchEngine nav variant
              Mobile: completely hidden until pastHero (scrolled 120% vh)
              Desktop: visible as soon as nav is solid (scrolled 50px) */}
          <div
            className={cn(
              "flex-1 flex justify-center transition-all duration-300",
              // Mobile visibility gate — overrides everything else
              !pastHero ? "hidden md:flex" : "",
              // Desktop + mobile-after-hero visibility
              solid
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-1.5 pointer-events-none"
            )}
          >
            <SearchEngine variant="nav" />
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {/* Explore trigger */}
            <div
              ref={exploreRef}
              onMouseEnter={handleExploreEnter}
              onMouseLeave={handleExploreLeave}
            >
              <button
                onClick={() => setExploreOpen(!exploreOpen)}
                className={cn(
                  "px-3.5 py-2 rounded-full text-[14px] font-medium transition-colors duration-200 flex items-center gap-1",
                  solid
                    ? "text-text2 hover:bg-surface hover:text-text"
                    : "text-white/80 hover:bg-white/12 hover:text-white"
                )}
              >
                Explore
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    exploreOpen && "rotate-180"
                  )}
                />
              </button>
            </div>

            {/* Other nav links — hidden below xl to give pill room */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hidden xl:flex px-3.5 py-2 rounded-full text-[14px] font-medium transition-colors duration-200 items-center gap-1.5",
                  solid
                    ? "text-text2 hover:bg-surface hover:text-text"
                    : "text-white/80 hover:bg-white/12 hover:text-white"
                )}
              >
                {link.label}
                {link.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-amber/12 border border-amber/25 text-[10.5px] font-bold text-amber">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link href="/become-a-host">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "border",
                  solid
                    ? "border-border text-text hover:border-dark"
                    : "border-white/25 text-white/85 hover:bg-white/12 hover:border-white/40"
                )}
              >
                List your space
              </Button>
            </Link>
            {/* Account dropdown (guest + host) */}
            {authState.loggedIn && authState.role !== "admin" ? (
              <div ref={accountRef} className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  className={cn(
                    "relative",
                    solid ? "bg-dark text-white" : "bg-white text-text"
                  )}
                  onClick={() => setAccountOpen(!accountOpen)}
                >
                  Account
                  <ChevronDown className={cn("size-3 ml-1 transition-transform", accountOpen && "rotate-180")} />
                  {enquiryCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E8A020] text-white text-[10px] font-bold flex items-center justify-center">
                      {enquiryCount > 99 ? "99+" : enquiryCount}
                    </span>
                  )}
                </Button>
                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-white shadow-xl z-[300]">
                    <AccountDropdownMenu />
                  </div>
                )}
              </div>
            ) : (
              <Link href={authState.loggedIn ? "/admin" : "/login"}>
                <Button
                  variant="secondary"
                  size="sm"
                  className={cn(
                    solid ? "bg-dark text-white" : "bg-white text-text"
                  )}
                >
                  {authState.loggedIn ? "Admin" : "Sign in"}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile user icon (logged in — guest + host get dropdown, admin gets direct link) */}
          {authState.loggedIn && authState.role !== "admin" ? (
            <button
              ref={(el) => { if (el && !accountRef.current) accountRef.current = el.parentElement as HTMLDivElement; }}
              onClick={() => setAccountOpen(!accountOpen)}
              className={cn(
                "md:hidden relative flex size-9 items-center justify-center rounded-full",
                solid || mobileOpen
                  ? "bg-[#E8A020]/15 text-[#E8A020]"
                  : "bg-white/15 text-white"
              )}
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {enquiryCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#E8A020] text-white text-[9px] font-bold flex items-center justify-center">
                  {enquiryCount > 99 ? "99+" : enquiryCount}
                </span>
              )}
            </button>
          ) : authState.loggedIn ? (
            <Link
              href="/admin"
              className={cn(
                "md:hidden flex size-9 items-center justify-center rounded-full",
                solid || mobileOpen
                  ? "bg-[#E8A020]/15 text-[#E8A020]"
                  : "bg-white/15 text-white"
              )}
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </Link>
          ) : null}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "md:hidden flex size-9 items-center justify-center rounded-full border",
              solid || mobileOpen ? "border-border text-text" : "border-white/30 text-white"
            )}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </button>
        </div>
      </nav>

      {/* Explore hover menu — link-based, independent */}
      {exploreOpen && (
        <ExploreHoverMenu
          dropRef={exploreDropRef}
          triggerRef={exploreRef}
          onMouseEnter={handleExploreEnter}
          onMouseLeave={handleExploreLeave}
        />
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[199] pt-[68px] bg-white md:hidden animate-fade-in overflow-y-auto">
          <div className="flex flex-col p-6 gap-1">
            {/* Journal + List your space — first */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 rounded-xl text-[16px] font-semibold text-text hover:bg-surface transition-colors flex items-center gap-2"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/become-a-host"
              className="px-4 py-3 rounded-xl text-[16px] font-semibold text-text hover:bg-surface transition-colors"
            >
              List your space
            </Link>

            <hr className="my-3 border-border" />

            {/* Categories with subcategories */}
            {EXPLORE_CATEGORIES.map((cat) => {
              const subs = SUBCATEGORIES_BY_TYPE[cat.type] ?? [];
              return (
                <div key={cat.type}>
                  <Link
                    href={cat.href}
                    className="px-4 py-3 rounded-xl text-[16px] font-semibold text-text hover:bg-surface transition-colors flex items-center gap-2"
                  >
                    <span className="text-[18px]">{cat.icon}</span>
                    {cat.label}
                  </Link>
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    {subs.map((sub) => (
                      <Link
                        key={sub}
                        href={`${cat.href}?sub=${sub}`}
                        className="text-[11.5px] text-text3 bg-surface px-2.5 py-1 rounded-full hover:bg-amber/10 hover:text-amber transition-colors"
                      >
                        {SUBCATEGORY_ICONS[sub]} {SUBCATEGORY_LABELS[sub] ?? sub}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="mt-4 pb-24 space-y-2">
              {authState.loggedIn && authState.role === "host" && (
                <Link href="/dashboard">
                  <Button variant="primary" size="lg" className="w-full">
                    Host Dashboard
                  </Button>
                </Link>
              )}
              <Link
                href={
                  authState.loggedIn
                    ? authState.role === "admin"
                      ? "/admin"
                      : "/profile"
                    : "/login"
                }
              >
                <Button variant={authState.role === "host" ? "ghost" : "primary"} size="lg" className={cn("w-full", authState.role === "host" && "border border-border")}>
                  {authState.loggedIn
                    ? authState.role === "admin"
                      ? "Admin"
                      : authState.role === "host"
                        ? "Guest Profile"
                        : "Account"
                    : "Sign in"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Account dropdown portal (mobile) — renders outside nav to avoid z-index/overflow issues */}
      {accountOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={accountDropRef}
          className="md:hidden fixed inset-0 z-[9998]"
        >
          <div
            className="absolute right-4 top-[72px] w-56 rounded-xl border border-border bg-white shadow-xl z-[9999]"
          >
            <AccountDropdownMenu />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export { Nav };
