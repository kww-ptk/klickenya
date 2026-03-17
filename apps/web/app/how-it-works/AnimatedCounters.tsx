"use client";

import { useEffect, useRef, useState } from "react";

interface CounterItem {
  target: number;
  suffix: string;
  label: string;
}

const COUNTERS: CounterItem[] = [
  { target: 120, suffix: "+", label: "Listings live" },
  { target: 15, suffix: "+", label: "Destinations" },
  { target: 12, suffix: "", label: "Counties covered" },
];

export function AnimatedCounters() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [counts, setCounts] = useState<number[]>(COUNTERS.map(() => 0));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    const duration = 1500;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      setCounts(COUNTERS.map((c) => Math.round(c.target * eased)));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [visible]);

  return (
    <div
      ref={ref}
      className="flex flex-wrap items-center justify-center gap-10 md:gap-16"
    >
      {COUNTERS.map((counter, i) => (
        <div key={counter.label} className="flex flex-col items-center">
          <span className="text-[28px] md:text-[36px] font-bold text-white tracking-[-0.02em]">
            {counts[i]}
            {counter.suffix}
          </span>
          <span className="text-[13px] text-white/45 font-medium mt-1">
            {counter.label}
          </span>
        </div>
      ))}
    </div>
  );
}
