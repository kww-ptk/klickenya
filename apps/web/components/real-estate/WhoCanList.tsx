import Link from "next/link";

const CARDS = [
  {
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop&q=80",
    pillLabel: "Agents",
    pillClass: "bg-purple-500/80 text-white",
    icon: "👔",
    title: "Real Estate Agents",
    body: "List your full portfolio. Receive enquiries directly. Build a verified profile and get found by buyers searching for agents in your area.",
    badge: "Free during launch",
    badgeClass: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
    cta: "List as an agent →",
    href: "/contact?type=agent",
  },
  {
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop&q=80",
    pillLabel: "Owners",
    pillClass: "bg-green-500/80 text-white",
    icon: "🏠",
    title: "Private Owners",
    body: "Sell or rent your property without paying agent commission. Upload photos, set your price, and receive direct enquiries from serious buyers.",
    badge: "No commission",
    badgeClass: "bg-green-500/15 text-green-400 border border-green-500/20",
    cta: "List your property →",
    href: "/how-it-works#listing-request",
  },
  {
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop&q=80",
    pillLabel: "Developers",
    pillClass: "bg-amber-500/80 text-white",
    icon: "🏗",
    title: "Developers",
    body: "Launch your new development on Klickenya. Off-plan sales, floor plans, and a dedicated project page that reaches pre-qualified buyers.",
    badge: "Premium placement",
    badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    cta: "Partner with us →",
    href: "/contact?type=developer",
  },
];

function WhoCanList() {
  return (
    <section className="bg-[#16130C] py-16 md:py-20 px-5 md:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-purple-400 mb-3">
          List on Klickenya Property
        </p>
        <h2 className="font-display text-[clamp(28px,3.5vw,36px)] font-bold text-white tracking-[-0.03em] mb-4">
          For agents, owners &amp; developers
        </h2>
        <p className="text-[15px] text-gray-400 max-w-xl leading-[1.65] mb-10 md:mb-12">
          Whether you&apos;re a registered agent, private seller, or property
          developer — list your properties free and reach serious buyers and
          renters across Kenya.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-2xl overflow-hidden bg-white border border-white/10 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-[200px] overflow-hidden">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                  loading="lazy"
                />
                {/* Pill badge on image */}
                <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${card.pillClass}`}>
                  {card.pillLabel}
                </span>
              </div>

              {/* Body */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[22px]">{card.icon}</span>
                  <h3 className="text-[17px] font-bold text-[#16130C]">
                    {card.title}
                  </h3>
                </div>
                <p className="text-[13.5px] text-[#5E5848] leading-[1.65] mb-4">
                  {card.body}
                </p>
                <span
                  className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-3 ${card.badgeClass}`}
                >
                  {card.badge}
                </span>
                <p className="text-[13px] font-semibold text-purple-600 group-hover:text-purple-500 transition-colors">
                  {card.cta}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom link */}
        <div className="mt-10 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-[13px] text-gray-500">
            Already have properties?{" "}
            <Link
              href="/how-it-works#listing-request"
              className="text-purple-400 font-semibold hover:underline"
            >
              Submit them via our listing form →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export { WhoCanList };
