import { sanityClient } from "@/lib/sanity/client";
import { PropertySearchBox } from "./PropertySearchBox";
import { MouseGlow } from "@/components/shared/MouseGlow";

async function PropertyHero() {
  const count: number = await sanityClient
    .fetch(`count(*[_type == "property"])`)
    .catch(() => 0);

  const stats = [
    { value: count > 0 ? `${count}+` : "Growing fast", label: "Properties listed" },
    { value: "47", label: "All counties covered" },
    { value: "Free", label: "No commission" },
    { value: "AI", label: "Free valuations" },
  ];
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg, #16130C 0%, #1a1610 40%, #1f1a12 70%, #16130C 100%)" }}>
      {/* Static ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] opacity-[0.1]"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 30%, #E8A020 0%, transparent 70%)" }}
      />
      {/* Swoosh decoration */}
      <div className="pointer-events-none absolute right-[-10vw] top-1/2 -translate-y-1/2 opacity-70 z-0">
        <svg viewBox="0 0 980 1100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[clamp(400px,55vw,800px)] h-auto">
          <path d="M 920 60 C 820 280, 340 380, 140 820" stroke="#E8A020" strokeWidth="44" strokeLinecap="round" fill="none" opacity=".04" />
          <path d="M 920 60 C 820 280, 340 380, 140 820" stroke="#E8A020" strokeWidth="18" strokeLinecap="round" fill="none" opacity=".08" />
          <path d="M 920 60 C 820 280, 340 380, 140 820" stroke="#F5C842" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".18" />
          <circle cx="920" cy="60" r="10" fill="#E8A020" opacity=".12" />
          <circle cx="140" cy="820" r="6" fill="#E8A020" opacity=".08" />
        </svg>
      </div>
      {/* Mouse-tracking amber glow */}
      <MouseGlow opacity={0.1} size={700} />

      {/* Content */}
      <div className="relative z-[2] flex-1 flex flex-col items-center justify-center px-6 pt-[110px] pb-9 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-[12px] border border-white/15 rounded-full px-4 py-1.5 text-[12px] font-semibold text-white/85 mb-6">
          <span className="relative flex size-[6px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75" />
            <span className="relative inline-flex size-[6px] rounded-full bg-amber" />
          </span>
          Kenya&apos;s property marketplace {count > 0 && <>&middot; {count}+ listings</>}
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
