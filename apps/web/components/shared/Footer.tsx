import Link from "next/link";
import Image from "next/image";
import { SwooshDivider } from "./SwooshDivider";

interface FooterLink {
  href: string;
  label: string;
}

interface FooterProps {
  exploreLinks?: FooterLink[];
  companyLinks?: FooterLink[];
  supportLinks?: FooterLink[];
}

const DEFAULT_EXPLORE: FooterLink[] = [
  { href: "/stays", label: "Stays" },
  { href: "/experiences", label: "Experiences" },
  { href: "/events", label: "Events" },
  { href: "/restaurants", label: "Restaurants" },
  { href: "/rentals", label: "Rentals" },
  { href: "/services", label: "Services" },
  { href: "/real-estate", label: "Property" },
];

const DEFAULT_COMPANY: FooterLink[] = [
  { href: "/about", label: "About us" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/journal", label: "Journal" },
  { href: "/how-it-works#ambassador", label: "Become an ambassador" },
  { href: "/contact", label: "Contact" },
];

const DEFAULT_SUPPORT: FooterLink[] = [
  { href: "/help", label: "Help centre" },
  { href: "/trust", label: "Trust & Safety" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/cancellation", label: "Cancellation policy" },
];

function Footer({
  exploreLinks = DEFAULT_EXPLORE,
  companyLinks = DEFAULT_COMPANY,
  supportLinks = DEFAULT_SUPPORT,
}: FooterProps) {
  return (
    <footer className="relative bg-dark overflow-hidden">
      {/* Background swoosh decoration */}
      <div className="absolute bottom-12 right-[-60px] opacity-[0.04] pointer-events-none">
        <SwooshDivider size="xl" color="#fff" rotation={-8} />
      </div>
      <div className="absolute top-20 left-[-40px] opacity-[0.03] pointer-events-none">
        <SwooshDivider size="xl" color="#fff" rotation={12} />
      </div>

      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 pt-16 pb-14 border-b border-white/[0.06]">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/logo-profile.jpg"
                alt="Klickenya"
                width={36}
                height={36}
                className="size-9 rounded-[10px] object-cover shrink-0"
              />
              <span className="text-[20px] font-bold text-white tracking-[-0.03em]">
                Klic<span className="text-amber">K</span>enya
              </span>
            </div>
            <p className="text-[13.5px] text-white/32 leading-[1.7] max-w-[260px] mb-6">
              Kenya&apos;s all-in-one platform for stays, experiences, events,
              rentals, services, and property. Built for Kenya.
            </p>
            {/* Social links */}
            <div className="flex gap-2">
              {[
                { label: "X", icon: "𝕏" },
                { label: "LinkedIn", icon: "in" },
                { label: "Instagram", icon: "IG" },
                { label: "Facebook", icon: "fb" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="size-[34px] rounded-[9px] bg-white/5 border border-white/7 flex items-center justify-center text-[13px] text-white/35 hover:bg-white/10 hover:text-white/80 transition-colors duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <FooterLinkColumn title="Explore" links={exploreLinks} />
          <FooterLinkColumn title="Company" links={companyLinks} />
          <FooterLinkColumn title="Support" links={supportLinks} />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-[12.5px] text-white/20">
            &copy; {new Date().getFullYear()} Klickenya. All rights reserved.
          </p>
          <div className="flex gap-5">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Sitemap", href: "/sitemap-page" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[12.5px] text-white/20 hover:text-white/55 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h4 className="text-[12px] font-bold text-white/45 uppercase tracking-[0.05em] mb-4">
        {title}
      </h4>
      <div className="flex flex-col gap-2.5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[13.5px] text-white/32 hover:text-white/82 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export { Footer };
