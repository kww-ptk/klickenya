"use client";

import { useEffect, useRef } from "react";

interface MouseGlowProps {
  color?: string;
  opacity?: number;
  size?: number;
}

export function MouseGlow({
  color = "232,160,32",
  opacity = 0.12,
  size = 600,
}: MouseGlowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number;
    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;

    function animate() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      el!.style.background = `radial-gradient(${size}px circle at ${currentX}% ${currentY}%, rgba(${color},${opacity}) 0%, transparent 60%)`;
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
  }, [color, opacity, size]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-[1]"
    />
  );
}
