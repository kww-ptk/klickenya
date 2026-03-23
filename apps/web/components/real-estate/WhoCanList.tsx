import Link from "next/link";

const CARDS = [
  {
    icon: "👔",
    title: "Real Estate Agents",
    body: "List your full portfolio. Receive enquiries directly. Build a verified profile and get found by buyers searching for agents in your area.",
    badge: "Free during launch",
    badgeClass: "bg-purple-500/20 text-purple-300",
    cta: "List as an agent →",
    href: "/contact?type=agent",
  },
  {
    icon: "🏠",
    title: "Private Owners",
    body: "Sell or rent your property without paying agent commission. Upload photos, set your price, and receive direct enquiries from serious buyers and renters.",
    badge: "No commission",
    badgeClass: "bg-green-500/20 text-green-300",
    cta: "List your property →",
    href: "/how-it-works#listing-request",
  },
  {
    icon: "🏗",
    title: "Developers",
    body: "Launch your new development on Klickenya. Off-plan sales, floor plan uploads, and a dedicated project page that ranks on Google and reaches pre-qualified buyers.",
    badge: "Premium placement",
    badgeClass: "bg-amber-500/20 text-amber-300",
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="border border-white/10 rounded-2xl p-6 bg-white/[0.03] hover:border-purple-500/40 transition-colors duration-200"
            >
              <span className="text-[32px] block mb-4">{card.icon}</span>
              <h3 className="text-[18px] font-bold text-white mb-2">
                {card.title}
              </h3>
              <p className="text-[14px] text-gray-400 leading-[1.65] mb-4">
                {card.body}
              </p>
              <span
                className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-4 ${card.badgeClass}`}
              >
                {card.badge}
              </span>
              <br />
              <Link
                href={card.href}
                className="text-[13px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                {card.cta}
              </Link>
            </div>
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
