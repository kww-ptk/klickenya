"use client";

import { useEffect, useRef, useState } from "react";

interface Tab {
  id: string;
  title: string;
}

export function MenuTabBar({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const barRef = useRef<HTMLDivElement>(null);
  const isClickScrolling = useRef(false);

  function handleClick(id: string) {
    setActiveId(id);
    const el = document.getElementById(`section-${id}`);
    if (!el) return;

    isClickScrolling.current = true;
    const top = el.getBoundingClientRect().top + window.scrollY - 56;
    window.scrollTo({ top, behavior: "smooth" });

    // Release scroll-spy lock after scroll completes
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  }

  // Scroll-spy: update active tab based on scroll position
  useEffect(() => {
    function onScroll() {
      if (isClickScrolling.current) return;

      const offset = 80;
      for (let i = tabs.length - 1; i >= 0; i--) {
        const el = document.getElementById(`section-${tabs[i].id}`);
        if (el && el.getBoundingClientRect().top <= offset) {
          setActiveId(tabs[i].id);
          return;
        }
      }
      if (tabs[0]) setActiveId(tabs[0].id);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tabs]);

  // Auto-scroll the tab bar to keep active tab visible
  useEffect(() => {
    const activeBtn = barRef.current?.querySelector(
      `[data-tab="${activeId}"]`
    ) as HTMLElement | null;
    if (activeBtn && barRef.current) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeId]);

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-border">
      <div
        ref={barRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide px-5 max-w-[480px] mx-auto"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-tab={tab.id}
            onClick={() => handleClick(tab.id)}
            className={`whitespace-nowrap px-4 py-3 text-[13px] font-semibold transition-colors border-b-2 ${
              tab.id === activeId
                ? "border-amber text-dark"
                : "border-transparent text-text3 hover:text-text2"
            }`}
          >
            {tab.title}
          </button>
        ))}
      </div>
    </div>
  );
}
