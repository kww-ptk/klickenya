"use client";

import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="bg-white min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Decorative amber swoosh */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.07] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, #f59e0b 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[700px] h-[180px] pointer-events-none opacity-[0.10]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, #f59e0b, transparent)",
          borderRadius: "50%",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-[480px]">
        {/* Icon */}
        <div className="size-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-8">
          <svg
            className="size-8 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="font-[family-name:var(--font-bricolage)] text-[clamp(26px,4vw,36px)] font-bold text-zinc-900 tracking-[-0.03em] mb-3">
          Something went wrong
        </h1>

        <p className="text-zinc-500 text-[16px] leading-[1.6] mb-10">
          Don&apos;t worry, it&apos;s not you. Let&apos;s get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 text-white font-semibold text-[15px] hover:bg-amber-600 shadow-[0_4px_14px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-200 text-zinc-700 font-semibold text-[15px] hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200"
          >
            <Home className="size-4" />
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
