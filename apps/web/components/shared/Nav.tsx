"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { Button } from "@/components/ui/Button";

interface NavProps {
  transparent?: boolean;
}

const NAV_LINKS = [
  { href: "/stays", label: "Explore" },
  { href: "/events", label: "Events" },
  { href: "/destinations", label: "Destinations" },
  { href: "/journal", label: "Journal" },
];

function Nav({ transparent = false }: NavProps) {
  const scrolled = useScrollPosition(50);
  const [mobileOpen, setMobileOpen] = useState(false);

  const solid = !transparent || scrolled;

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
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="size-8 rounded-[9px] bg-dark flex items-center justify-center shrink-0">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 3v18M5 12l8-9M5 12l8 9" />
              </svg>
            </div>
            <span
              className={cn(
                "text-[17px] font-bold tracking-[-0.03em]",
                solid ? "text-text" : "text-white"
              )}
            >
              <span className="text-amber">k</span>lickenya
            </span>
          </Link>

          {/* Condensed search pill — visible on scroll */}
          <div
            className={cn(
              "hidden md:flex flex-1 max-w-[340px] items-center bg-white border border-border rounded-full py-2 pl-[18px] pr-2 shadow-sm cursor-pointer transition-all duration-300",
              "hover:shadow-md",
              solid
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-1.5 pointer-events-none"
            )}
          >
            <span className="flex-1 text-[13px] font-semibold text-text2">
              Anywhere
            </span>
            <span className="w-px h-4 bg-border mx-2.5" />
            <span className="text-[13px] font-semibold text-text2">
              Any time
            </span>
            <span className="w-px h-4 bg-border mx-2.5" />
            <span className="text-[13px] font-semibold text-text2">
              Any type
            </span>
            <div className="ml-2 size-8 rounded-full bg-amber flex items-center justify-center shrink-0">
              <Search className="size-3.5 text-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3.5 py-2 rounded-full text-[14px] font-medium transition-colors duration-200",
                  solid
                    ? "text-text2 hover:bg-surface hover:text-text"
                    : "text-white/80 hover:bg-white/12 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
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
            <Button
              variant="secondary"
              size="sm"
              className={cn(
                solid
                  ? "bg-dark text-white"
                  : "bg-white text-text"
              )}
            >
              Sign in
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "md:hidden flex size-9 items-center justify-center rounded-full border",
              solid ? "border-border text-text" : "border-white/30 text-white"
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[199] pt-[68px] bg-white md:hidden animate-fade-in">
          <div className="flex flex-col p-6 gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-xl text-[16px] font-semibold text-text hover:bg-surface transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-3 border-border" />
            <Link
              href="/list"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-xl text-[16px] font-semibold text-text2 hover:bg-surface transition-colors"
            >
              List your space
            </Link>
            <div className="mt-4">
              <Button variant="primary" size="lg" className="w-full">
                Sign in
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { Nav };
