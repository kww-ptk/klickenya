"use client";

import { useEffect, useRef } from "react";

export function DestinationsHeroGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    let rafId: number;
    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;

    function animate() {
      // Smooth lerp
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      el!.style.background = `radial-gradient(600px circle at ${currentX}% ${currentY}%, rgba(232,160,32,0.12) 0%, transparent 60%)`;

      rafId = requestAnimationFrame(animate);
    }

    function handleMouseMove(e: MouseEvent) {
      const section = el!.parentElement;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width) * 100;
      targetY = ((e.clientY - rect.top) / rect.height) * 100;
    }

    const section = el.parentElement;
    section?.addEventListener("mousemove", handleMouseMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      section?.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500"
    />
  );
}
