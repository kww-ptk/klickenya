"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface Filter { label?: string; value?: string; icon?: string; color?: string }
interface Item { name?: string; tags?: string[]; priceBand?: string; blurb?: string; href?: string }
interface FilterableListValue {
  title?: string;
  intro?: string;
  allLabel?: string;
  filters?: Filter[];
  items?: Item[];
}

const chipStyles: Record<string, { on: string; off: string }> = {
  teal: {
    on: "bg-[rgba(13,115,119,.14)] border-[rgba(13,115,119,.45)] text-teal",
    off: "bg-[rgba(13,115,119,.05)] border-[rgba(13,115,119,.18)] text-[#5C574E] hover:border-[rgba(13,115,119,.35)]",
  },
  blue: {
    on: "bg-[rgba(37,99,235,.12)] border-[rgba(37,99,235,.42)] text-[#2563EB]",
    off: "bg-[rgba(37,99,235,.04)] border-[rgba(37,99,235,.16)] text-[#5C574E] hover:border-[rgba(37,99,235,.32)]",
  },
  purple: {
    on: "bg-[rgba(139,77,171,.16)] border-[rgba(139,77,171,.45)] text-purple2",
    off: "bg-[rgba(139,77,171,.05)] border-[rgba(139,77,171,.18)] text-[#5C574E] hover:border-[rgba(139,77,171,.35)]",
  },
  amber: {
    on: "bg-[rgba(232,160,32,.16)] border-[rgba(232,160,32,.45)] text-[#B8860B]",
    off: "bg-[rgba(232,160,32,.05)] border-[rgba(232,160,32,.18)] text-[#5C574E] hover:border-[rgba(232,160,32,.35)]",
  },
  green: {
    on: "bg-[rgba(34,139,84,.14)] border-[rgba(34,139,84,.45)] text-[#228B54]",
    off: "bg-[rgba(34,139,84,.05)] border-[rgba(34,139,84,.18)] text-[#5C574E] hover:border-[rgba(34,139,84,.35)]",
  },
};

export function FilterableListBlock({ value }: { value: FilterableListValue }) {
  const { title, intro, allLabel = "All", filters = [], items = [] } = value;
  const [active, setActive] = useState<string | null>(null);

  const shown = useMemo(
    () => (active ? items.filter((i) => (i.tags ?? []).includes(active)) : items),
    [active, items],
  );

  return (
    <section className="my-9">
      {title && (
        <p className="font-[family-name:'Bricolage_Grotesque'] text-[20px] font-bold text-[#18160F] tracking-tight mb-2">
          {title}
        </p>
      )}
      {intro && <p className="text-[15px] leading-[1.6] text-[#5C574E] mb-4">{intro}</p>}

      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Filter the list">
        <button
          type="button"
          onClick={() => setActive(null)}
          aria-pressed={active === null}
          className={`text-[13px] font-semibold rounded-full border px-3.5 py-2 transition-colors min-h-[40px] ${
            active === null
              ? "bg-[#18160F] border-[#18160F] text-white"
              : "bg-transparent border-[#E2DDD5] text-[#5C574E] hover:border-[#B9B2A6]"
          }`}
        >
          {allLabel}
          <span className="ml-1.5 opacity-60">{items.length}</span>
        </button>

        {filters.map((f) => {
          const count = items.filter((i) => (i.tags ?? []).includes(f.value ?? "")).length;
          const s = chipStyles[f.color || "teal"];
          const on = active === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setActive(on ? null : (f.value ?? null))}
              aria-pressed={on}
              className={`text-[13px] font-semibold rounded-full border px-3.5 py-2 transition-colors min-h-[40px] ${on ? s.on : s.off}`}
            >
              {f.icon && <span className="mr-1.5">{f.icon}</span>}
              {f.label}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((item, i) => {
          const card = (
            <>
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <p className="font-[family-name:'Bricolage_Grotesque'] text-[16px] font-bold text-[#18160F] tracking-tight">
                  {item.name}
                </p>
                {item.priceBand && (
                  <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-[.06em] text-[#9B9589] whitespace-nowrap pt-0.5">
                    {item.priceBand}
                  </span>
                )}
              </div>
              {item.blurb && (
                <p className="text-[13.5px] leading-[1.5] text-[#5C574E]">{item.blurb}</p>
              )}
            </>
          );

          const cls =
            "block p-4 rounded-[18px] border border-[#E8E3DA] bg-[rgba(255,255,255,.6)] transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,.07)] hover:border-[#D6CFC2]";

          return item.href ? (
            <Link key={i} href={item.href} className={cls}>
              {card}
            </Link>
          ) : (
            <div key={i} className={cls}>
              {card}
            </div>
          );
        })}
      </div>

      {shown.length === 0 && (
        <p className="text-[14px] text-[#9B9589] italic py-6 text-center">
          Nothing matches that filter yet.
        </p>
      )}
    </section>
  );
}
