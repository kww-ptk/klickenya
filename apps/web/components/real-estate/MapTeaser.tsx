import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Search, Plus, Minus } from 'lucide-react';

const features = [
  'Draw any shape — circle, polygon, freehand',
  'See commute times to your workplace or school',
  'Filter by price, beds, property type on the map',
  'Save searches and get alerts for new listings',
];

const pins: Array<{ price: string; left: string; top: string; gold?: boolean }> = [
  { price: 'KSh 12M', left: '38%', top: '42%' },
  { price: 'KSh 8.5M', left: '55%', top: '35%', gold: true },
  { price: 'KSh 22M', left: '28%', top: '56%' },
  { price: 'KSh 6M', left: '65%', top: '52%' },
  { price: 'KSh 18M', left: '48%', top: '62%', gold: true },
];

function MapTeaser() {
  return (
    <section className="bg-surface py-[72px] px-5 md:px-10">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12 items-center">
        {/* Left */}
        <div>
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-1.5 block">
            Map Search
          </span>
          <h2 className="text-[clamp(22px,2.8vw,34px)] font-semibold tracking-[-0.03em] text-text leading-[1.1] mb-3.5">
            Draw your search
            <br />
            on the map
          </h2>
          <p className="text-[15px] text-text2 leading-[1.7] mb-6">
            Forget boring dropdowns. Draw directly on the map to find properties exactly where you want to live.
          </p>

          <ul className="flex flex-col gap-2.5 mb-7">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[14px] text-text2">
                <span className="size-2 rounded-full bg-purple2 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Link
            href="/early-access"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple2 text-white text-[14px] font-bold shadow-[0_4px_14px_rgba(139,77,171,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(139,77,171,0.4)] transition-all"
          >
            Get early access &rarr;
          </Link>
        </div>

        {/* Right — Map Mockup */}
        <div className="relative rounded-[30px] overflow-hidden h-[400px] shadow-xl bg-[#E8E4DC]">
          {/* Placeholder background */}
          <div className="absolute inset-0 bg-surface2 bg-gradient-to-br from-surface2 to-[#D5D0C8]" />

          {/* Overlay */}
          <div className="absolute inset-0 bg-white/5" />

          {/* Search bar chrome */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/90 backdrop-blur-[8px] rounded-full px-3.5 py-2 shadow-sm">
              <Search className="size-3.5 text-text3 shrink-0" />
              <span className="text-[12px] text-text3">Search Nairobi...</span>
            </div>
            <div className="flex flex-col gap-1">
              <button className="size-7 rounded-lg bg-white/90 backdrop-blur-[8px] flex items-center justify-center shadow-sm">
                <Plus className="size-3.5 text-text2" />
              </button>
              <button className="size-7 rounded-lg bg-white/90 backdrop-blur-[8px] flex items-center justify-center shadow-sm">
                <Minus className="size-3.5 text-text2" />
              </button>
            </div>
          </div>

          {/* Pins */}
          {pins.map((pin) => (
            <div
              key={pin.price}
              className="absolute"
              style={{ left: pin.left, top: pin.top }}
            >
              <div
                className={cn(
                  'px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap',
                  pin.gold
                    ? 'bg-amber text-dark shadow-[0_4px_12px_rgba(232,160,32,0.4)]'
                    : 'bg-purple2 text-white shadow-[0_4px_12px_rgba(139,77,171,0.4)]'
                )}
              >
                {pin.price}
              </div>
              {/* Triangle */}
              <div
                className="w-0 h-0 mx-auto"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: pin.gold ? '6px solid #E8A020' : '6px solid #8B4DAB',
                }}
              />
            </div>
          ))}

          {/* Results chip */}
          <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 bg-dark/85 backdrop-blur-[10px] text-white px-4.5 py-2 rounded-full text-[13px] font-semibold shadow-md whitespace-nowrap">
            📍 248 properties in this area
          </div>
        </div>
      </div>
    </section>
  );
}

export { MapTeaser };
