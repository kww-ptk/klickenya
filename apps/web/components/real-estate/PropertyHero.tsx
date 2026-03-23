"use client";

import { useRef, useEffect, useCallback } from "react";
import { PropertySearchBox } from "./PropertySearchBox";

const stats = [
  { value: "12,400+", label: "Active listings" },
  { value: "47", label: "Counties covered" },
  { value: "850+", label: "Verified agents" },
  { value: "Free", label: "AI valuation tool" },
];

function PropertyHero() {
  const glowRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const glow = glowRef.current;
    const section = sectionRef.current;
    if (!glow || !section) return;

    const rect = section.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    glow.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    glow.style.opacity = "1";
  }, []);

  const handleMouseLeave = useCallback(() => {
    const glow = glowRef.current;
    if (glow) glow.style.opacity = "0";
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    section.addEventListener("mousemove", handleMouseMove);
    section.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      section.removeEventListener("mousemove", handleMouseMove);
      section.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: "#0C0A06" }}
    >
      {/* Noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
        }}
      />

      {/* Static ambient amber glow — top */}
      <div
        className="pointer-events-none absolute -top-[200px] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-[0.12] z-[1]"
        style={{
          background:
            "radial-gradient(ellipse at center, #E8A020 0%, transparent 70%)",
        }}
      />

      {/* Static ambient amber glow — bottom corners */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[300px] opacity-[0.06] z-[1]"
        style={{
          background:
            "linear-gradient(135deg, #E8A020 0%, transparent 40%, transparent 60%, #E8A020 100%)",
        }}
      />

      {/* Mouse-following amber glow */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute top-0 left-0 z-[2] opacity-0"
        style={{
          width: 600,
          height: 600,
          background:
            "radial-gradient(circle, rgba(232,160,32,0.12) 0%, rgba(232,160,32,0.04) 35%, transparent 70%)",
          transition: "opacity 0.4s ease",
          willChange: "transform",
        }}
      />

      {/* Content */}
      <div className="relative z-[3] flex-1 flex flex-col items-center justify-center px-6 pt-[110px] pb-9 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/[0.06] backdrop-blur-[12px] border border-white/[0.1] rounded-full px-4 py-1.5 text-[12px] font-semibold text-white/80 mb-6">
          <span className="relative flex size-[6px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75" />
            <span className="relative inline-flex size-[6px] rounded-full bg-amber" />
          </span>
          Kenya&apos;s property marketplace &middot; 12,000+ listings
        </div>

        {/* Heading */}
        <h1
          className="font-display font-bold text-white tracking-[-0.04em] leading-[0.97] mb-5"
          style={{ fontSize: "clamp(42px, 6.5vw, 84px)" }}
        >
          Find your home
          <br />
          in{" "}
          <span className="bg-gradient-to-r from-amber to-[#F5C842] bg-clip-text text-transparent">
            Kenya
          </span>
          <span
            className="block bg-gradient-to-br from-white/70 to-white/35 bg-clip-text text-transparent"
            style={{ fontSize: "clamp(28px, 4vw, 54px)" }}
          >
            Buy &middot; Sell &middot; Rent
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-white/45 max-w-[460px] leading-[1.65] mb-10"
          style={{ fontSize: "clamp(15px, 1.8vw, 18px)" }}
        >
          Search thousands of properties across all 47 counties. Verified
          listings, transparent pricing, and AI-powered valuations.
        </p>

        {/* Search box */}
        <PropertySearchBox />
      </div>

      {/* Stats bar */}
      <div className="relative z-[3] flex items-center justify-center gap-0 px-6 pb-10 flex-wrap">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="px-7 py-3.5 text-center border-r border-white/[0.08] last:border-r-0"
          >
            <div className="text-[24px] font-bold text-amber tracking-[-0.03em]">
              {stat.value}
            </div>
            <div className="text-[12px] text-white/30 mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { PropertyHero };
