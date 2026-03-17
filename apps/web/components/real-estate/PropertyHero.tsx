import { PropertySearchBox } from "./PropertySearchBox";

const stats = [
  { value: "12,400+", label: "Active listings" },
  { value: "47", label: "Counties covered" },
  { value: "850+", label: "Verified agents" },
  { value: "Free", label: "AI valuation tool" },
];

function PropertyHero() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-dark">
      {/* Background mosaic grid */}
      <div className="absolute inset-0 grid grid-cols-[1.2fr_0.9fr_0.9fr] grid-rows-2 gap-[3px]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="overflow-hidden">
            <div
              className="w-full h-full bg-surface2 animate-[heroZoom_25s_ease-in-out_infinite_alternate]"
              style={{
                animationDelay: `${i * -4}s`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Overlay gradient */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,14,0.7) 0%, rgba(10,10,14,0.55) 40%, rgba(10,10,14,0.75) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-[2] flex-1 flex flex-col items-center justify-center px-6 pt-[110px] pb-9 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-[12px] border border-white/15 rounded-full px-4 py-1.5 text-[12px] font-semibold text-white/85 mb-6">
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
          in <span className="text-amber">Kenya</span>
          <span
            className="block bg-gradient-to-br from-white to-white/55 bg-clip-text text-transparent"
            style={{ fontSize: "clamp(28px, 4vw, 54px)" }}
          >
            Buy &middot; Sell &middot; Rent
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-white/55 max-w-[460px] leading-[1.65] mb-10"
          style={{ fontSize: "clamp(15px, 1.8vw, 18px)" }}
        >
          Search thousands of properties across all 47 counties. Verified
          listings, transparent pricing, and AI-powered valuations.
        </p>

        {/* Search box */}
        <PropertySearchBox />
      </div>

      {/* Stats bar */}
      <div className="relative z-[2] flex items-center justify-center gap-0 px-6 pb-8 flex-wrap">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="px-7 py-3.5 text-center border-r border-white/10 last:border-r-0"
          >
            <div className="text-[24px] font-bold text-amber tracking-[-0.03em]">
              {stat.value}
            </div>
            <div className="text-[12px] text-white/40 mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { PropertyHero };
