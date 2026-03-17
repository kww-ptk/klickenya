'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const marketCards = [
  { icon: '🏙', label: 'Avg. price/sqm · Nairobi', value: 'KSh 124,500', change: '+8.2%', up: true },
  { icon: '🔑', label: 'Avg. rent · 2BR Nairobi', value: 'KSh 68,000 / mo', change: '+4.1%', up: true },
  { icon: '📊', label: 'Avg. rental yield · Nairobi', value: '6.8% p.a.', change: '-0.3%', up: false },
  { icon: '⏱', label: 'Avg. days on market', value: '42 days', change: '-6 days', up: false },
];

const barData = [
  { label: 'Kilimani', val: 124, highlight: true },
  { label: 'Westlands', val: 138, highlight: false },
  { label: 'Karen', val: 95, highlight: false },
  { label: 'Lavington', val: 112, highlight: false },
  { label: 'Upperhill', val: 165, highlight: false },
  { label: 'Nyali', val: 78, highlight: true },
];

const maxVal = Math.max(...barData.map((d) => d.val));

function MarketDataStrip() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-dark py-14 px-5 md:px-10">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
        {/* Left */}
        <div>
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber mb-1.5 block">
            Market Data
          </span>
          <h2 className="text-[clamp(22px,2.8vw,34px)] font-semibold tracking-[-0.03em] text-white leading-[1.1]">
            Kenya property
            <br />
            market at a glance
          </h2>
          <p className="text-[14px] text-white/45 mt-2.5 leading-[1.55]">
            Real-time insights from thousands of listings across Kenya&apos;s top markets.
          </p>

          <div className="flex flex-col gap-3 mt-7">
            {marketCards.map((card) => (
              <div
                key={card.label}
                className="flex items-center gap-4 bg-white/5 border border-white/[0.07] rounded-[16px] px-5 py-4 hover:bg-white/[0.09] transition-colors"
              >
                <div className="size-10 rounded-[10px] bg-amber/[0.12] flex items-center justify-center text-[18px] shrink-0">
                  {card.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-white/40 font-medium mb-0.5">{card.label}</p>
                  <p className="text-[20px] font-bold text-white tracking-[-0.03em]">{card.value}</p>
                </div>
                <span
                  className={cn(
                    'shrink-0 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold',
                    card.up ? 'bg-green/15 text-[#4ADE80]' : 'bg-red-500/15 text-[#F87171]'
                  )}
                >
                  {card.change}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Bar Chart */}
        <div>
          <h3 className="text-[13px] font-semibold text-white/50 mb-5 tracking-[0.02em] uppercase">
            Avg. price per sqm by neighbourhood (KSh &apos;000)
          </h3>
          <div ref={chartRef} className="flex items-end gap-2.5 h-[160px]">
            {barData.map((bar) => {
              const pct = (bar.val / maxVal) * 100;
              return (
                <div key={bar.label} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className={cn(
                      'w-full rounded-t-[4px] transition-all duration-700 ease-out',
                      bar.highlight
                        ? 'bg-gradient-to-t from-amber/80 to-amber'
                        : 'bg-gradient-to-t from-purple2/60 to-purple2'
                    )}
                    style={{
                      height: animated ? `${pct}%` : '0%',
                    }}
                  />
                  <span className="text-[11px] text-white/30 text-center font-medium mt-2">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export { MarketDataStrip };
