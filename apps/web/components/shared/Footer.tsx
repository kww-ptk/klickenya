import Link from "next/link";
import Image from "next/image";

const DESTINATIONS = [
  { href: "/stays/watamu", label: "Watamu" },
  { href: "/stays/kilifi", label: "Kilifi" },
  { href: "/stays/diani-beach", label: "Diani Beach" },
  { href: "/stays/nairobi", label: "Nairobi" },
  { href: "/stays/lamu", label: "Lamu" },
  { href: "/stays/malindi", label: "Malindi" },
];

const EXPLORE = [
  { href: "/stays", label: "Stays" },
  { href: "/experiences", label: "Experiences" },
  { href: "/experiences?sub=restaurants", label: "Restaurants" },
  { href: "/events", label: "Events" },
  { href: "/services", label: "Services" },
  { href: "/real-estate", label: "Real Estate" },
];

const COMPANY = [
  { href: "/about", label: "About us" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/become-a-host", label: "Become a host" },
  { href: "/list", label: "List your business" },
  { href: "/journal", label: "Journal" },
  { href: "/destinations", label: "Destinations" },
  { href: "/how-it-works#ambassador", label: "Ambassadors" },
  { href: "/contact", label: "Contact" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
  { href: "/cancellation", label: "Cancellation" },
  { href: "/help", label: "Help centre" },
];

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/klickenya", icon: "IG" },
  { label: "Facebook", href: "https://facebook.com/klickenya", icon: "fb" },
  { label: "X", href: "https://x.com/klickenya", icon: "𝕏" },
  { label: "LinkedIn", href: "https://linkedin.com/company/klickenya", icon: "in" },
];

function Footer() {
  return (
    <footer className="bg-[#16130C]">
      {/* ── Main section ──────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 pt-14 md:pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-6">
          {/* Brand — spans 2 cols on md */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <Image
                src="/logo-profile.jpg"
                alt="Klickenya"
                width={36}
                height={36}
                className="size-9 rounded-[10px] object-cover"
              />
              <span className="text-[18px] font-bold text-white tracking-[-0.02em]">
                Klic<span className="text-[#E8A020]">K</span>enya
              </span>
            </Link>
            <p className="text-[13px] text-white/35 leading-[1.7] max-w-[260px] mb-6">
              Kenya&apos;s all-in-one marketplace for stays, experiences, events,
              and services. Built for Kenya.
            </p>
            {/* Social icons */}
            <div className="flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="size-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-[11px] text-white/30 hover:bg-[#E8A020]/15 hover:text-[#E8A020] transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Destinations */}
          <div>
            <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-[0.08em] mb-4">
              Destinations
            </h4>
            <nav className="flex flex-col gap-2.5">
              {DESTINATIONS.map((l) => (
                <Link key={l.href} href={l.href} className="text-[13px] text-white/30 hover:text-white/70 transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-[0.08em] mb-4">
              Explore
            </h4>
            <nav className="flex flex-col gap-2.5">
              {EXPLORE.map((l) => (
                <Link key={l.href} href={l.href} className="text-[13px] text-white/30 hover:text-white/70 transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-[0.08em] mb-4">
              Company
            </h4>
            <nav className="flex flex-col gap-2.5">
              {COMPANY.map((l) => (
                <Link key={l.href} href={l.href} className="text-[13px] text-white/30 hover:text-white/70 transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-[0.08em] mb-4">
              Legal
            </h4>
            <nav className="flex flex-col gap-2.5">
              {LEGAL.map((l) => (
                <Link key={l.href} href={l.href} className="text-[13px] text-white/30 hover:text-white/70 transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* ── CTA banner ────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 pb-8">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-white">
              List your place or event on Klickenya
            </p>
            <p className="text-[12px] text-white/30 mt-0.5">
              Reach thousands of travellers across Kenya — it&apos;s free to get started.
            </p>
          </div>
          <Link
            href="/become-a-host"
            className="relative shrink-0 px-5 py-2.5 bg-[#E8A020] text-[#16130C] text-[13px] font-bold rounded-full hover:bg-[#d4910f] transition-all duration-200 hover:scale-105"
          >
            <span className="absolute inset-0 rounded-full bg-[#E8A020] animate-[glow-ping_2.5s_ease-in-out_infinite] opacity-0" />
            <span className="relative">Get started →</span>
          </Link>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────── */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-white/20">
            &copy; {new Date().getFullYear()} Klickenya. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-[12px] text-white/20">
            <span>🇰🇪</span>
            <span>Made in Kenya</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
