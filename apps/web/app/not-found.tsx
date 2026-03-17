import type { Metadata } from "next";
import Link from "next/link";
import { Home, Bed, BookOpen, Building2, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  description: "This page doesn't exist, but Kenya has plenty of amazing places that do.",
};

export default function NotFound() {
  return (
    <main className="bg-white min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Decorative amber swoosh */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, #f59e0b 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[800px] h-[200px] pointer-events-none opacity-[0.12]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, #f59e0b, transparent)",
          borderRadius: "50%",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-[560px]">
        {/* 404 */}
        <h1
          className="font-[family-name:var(--font-bricolage)] font-extrabold tracking-[-0.06em] leading-none mb-6"
          style={{
            fontSize: "clamp(100px, 20vw, 180px)",
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </h1>

        <h2 className="font-[family-name:var(--font-bricolage)] text-[clamp(22px,3.5vw,32px)] font-bold text-zinc-900 tracking-[-0.02em] mb-3">
          This page doesn&apos;t exist yet
        </h2>

        <p className="text-zinc-500 text-[16px] leading-[1.6] mb-10">
          But Kenya has plenty of amazing places that do.
        </p>

        {/* Search bar */}
        <form
          action="/stays"
          method="GET"
          className="w-full max-w-[420px] mb-10"
        >
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-full px-5 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <Search className="size-5 text-zinc-400 shrink-0" />
            <input
              type="text"
              name="q"
              placeholder="Search for stays, experiences..."
              className="flex-1 bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none"
            />
            <button
              type="submit"
              className="shrink-0 px-4 py-1.5 rounded-full bg-amber-500 text-white text-[13px] font-semibold hover:bg-amber-600 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Link cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-[480px]">
          {[
            { href: "/", label: "Home", icon: Home },
            { href: "/stays", label: "Explore stays", icon: Bed },
            { href: "/journal", label: "Journal", icon: BookOpen },
            { href: "/real-estate", label: "Real Estate", icon: Building2 },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-zinc-200 bg-zinc-50 hover:border-amber-300 hover:bg-amber-50 transition-all duration-200 group"
            >
              <Icon className="size-5 text-zinc-400 group-hover:text-amber-600 transition-colors" />
              <span className="text-[13px] font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
