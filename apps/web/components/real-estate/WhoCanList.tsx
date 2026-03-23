import Link from "next/link";

const CARDS = [
  {
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop&q=80",
    pillLabel: "Agents",
    pillClass: "bg-purple-600 text-white",
    accentColor: "purple",
    icon: "👔",
    title: "Real Estate Agents",
    body: "List your full portfolio. Receive enquiries directly. Build a verified profile and get found by buyers searching in your area.",
    badge: "Free during launch",
    badgeClass: "bg-purple-50 text-purple-600 ring-1 ring-purple-200",
    cta: "List as an agent",
    href: "/real-estate/list",
  },
  {
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop&q=80",
    pillLabel: "Owners",
    pillClass: "bg-emerald-600 text-white",
    accentColor: "green",
    icon: "🏠",
    title: "Private Owners",
    body: "Sell or rent without agent commission. Upload photos, set your price, and receive direct enquiries from serious buyers.",
    badge: "No commission",
    badgeClass: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
    cta: "List your property",
    href: "/real-estate/list",
  },
  {
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop&q=80",
    pillLabel: "Developers",
    pillClass: "bg-amber-500 text-white",
    accentColor: "amber",
    icon: "🏗",
    title: "Developers",
    body: "Launch your project on Klickenya. Off-plan sales, floor plans, and a dedicated page that reaches pre-qualified buyers.",
    badge: "Premium placement",
    badgeClass: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
    cta: "Partner with us",
    href: "/real-estate/list",
  },
];

function WhoCanList() {
  return (
    <section className="bg-[#FAFAF8] py-16 md:py-24 px-5 md:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-purple-500 bg-purple-50 px-4 py-1.5 rounded-full mb-5">
            List on Klickenya Property
          </span>
          <h2 className="font-display text-[clamp(28px,4vw,40px)] font-bold text-[#16130C] tracking-[-0.03em] mb-4">
            For agents, owners &amp; developers
          </h2>
          <p className="text-[16px] text-[#5E5848] max-w-lg mx-auto leading-[1.65]">
            Whether you&apos;re a registered agent, private seller, or developer
            — list your properties free and reach buyers across Kenya.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-7">
          {CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group relative rounded-[20px] overflow-hidden bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_20px_48px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-[180px] md:h-[200px] overflow-hidden">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-out"
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                {/* Pill */}
                <span className={`absolute top-3.5 left-3.5 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm ${card.pillClass}`}>
                  {card.pillLabel}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-[24px] leading-none">{card.icon}</span>
                  <h3 className="text-[18px] font-bold text-[#16130C] tracking-[-0.01em]">
                    {card.title}
                  </h3>
                </div>

                <p className="text-[13.5px] text-[#5E5848] leading-[1.7] mb-5">
                  {card.body}
                </p>

                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${card.badgeClass}`}>
                    {card.badge}
                  </span>
                  <span className="text-[13px] font-semibold text-purple-600 group-hover:text-purple-500 transition-colors flex items-center gap-1">
                    {card.cta}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform duration-200"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className={`h-[3px] ${
                card.accentColor === "purple" ? "bg-purple-500" :
                card.accentColor === "green" ? "bg-emerald-500" :
                "bg-amber-500"
              }`} />
            </Link>
          ))}
        </div>

        {/* Bottom link */}
        <div className="mt-12 text-center">
          <p className="text-[14px] text-[#9C9485]">
            Already have properties?{" "}
            <Link
              href="/real-estate/list"
              className="text-purple-600 font-semibold hover:underline"
            >
              Submit via our listing form →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export { WhoCanList };
