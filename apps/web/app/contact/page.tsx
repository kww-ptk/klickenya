import type { Metadata } from "next";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Klickenya team. Whether you want to list your space, have a question, or just want to say hello — we'd love to hear from you.",
  openGraph: {
    title: "Contact Us | Klickenya",
    description:
      "Reach out to the Klickenya team. We reply within 24 hours.",
    siteName: "Klickenya",
    type: "website",
    locale: "en_KE",
  },
};

export default function ContactPage() {
  return (
    <>
      <Nav />

      {/* ─── HERO ─────────────────────────────────────── */}
      <section className="pt-32 pb-12 md:pt-40 md:pb-16 px-5">
        <div className="max-w-[1280px] mx-auto text-center">
          <h1
            className="font-display font-bold text-text tracking-[-0.04em] leading-[1.08] mb-4"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            Get in touch
          </h1>
          <p className="text-text2 text-[16px] md:text-[18px] max-w-[560px] mx-auto leading-[1.65]">
            Whether you want to list your space, have a question, or just want
            to say hello — we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* ─── FORM + INFO ─────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
          {/* Left — Form (3 cols) */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>

          {/* Right — Contact info (2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Email */}
            <div className="bg-surface rounded-[20px] border border-border p-6">
              <div className="flex items-start gap-4">
                <span className="text-[24px]">{"\uD83D\uDCE7"}</span>
                <div>
                  <h3 className="text-[15px] font-semibold text-text mb-1">
                    Email
                  </h3>
                  <a
                    href="mailto:hello@klickenya.com"
                    className="text-[14px] text-amber hover:underline"
                  >
                    hello@klickenya.com
                  </a>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-surface rounded-[20px] border border-border p-6">
              <div className="flex items-start gap-4">
                <span className="text-[24px]">{"\uD83D\uDCF1"}</span>
                <div>
                  <h3 className="text-[15px] font-semibold text-text mb-1">
                    WhatsApp
                  </h3>
                  <a
                    href="https://wa.me/254700000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-amber hover:underline"
                  >
                    +254 700 000 000
                  </a>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-surface rounded-[20px] border border-border p-6">
              <div className="flex items-start gap-4">
                <span className="text-[24px]">{"\uD83D\uDCCD"}</span>
                <div>
                  <h3 className="text-[15px] font-semibold text-text mb-1">
                    Location
                  </h3>
                  <p className="text-[14px] text-text2">Nairobi, Kenya</p>
                </div>
              </div>
            </div>

            {/* Response time */}
            <div className="bg-surface rounded-[20px] border border-border p-6">
              <div className="flex items-start gap-4">
                <span className="text-[24px]">{"\u23F1"}</span>
                <div>
                  <h3 className="text-[15px] font-semibold text-text mb-1">
                    Response time
                  </h3>
                  <p className="text-[14px] text-text2">
                    We reply within 24 hours
                  </p>
                </div>
              </div>
            </div>

            {/* Social links */}
            <div className="bg-surface rounded-[20px] border border-border p-6">
              <h3 className="text-[15px] font-semibold text-text mb-4">
                Follow us
              </h3>
              <div className="flex items-center gap-4">
                {SOCIALS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-10 rounded-[12px] bg-white border border-border flex items-center justify-center text-text3 hover:text-amber hover:border-amber/30 transition-colors"
                    aria-label={social.label}
                  >
                    <svg
                      className="size-[18px]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d={social.iconPath} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

/* ─── Static data ───────────────────────────────── */

const SOCIALS = [
  {
    label: "Instagram",
    href: "#",
    iconPath:
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    label: "X (Twitter)",
    href: "#",
    iconPath:
      "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "LinkedIn",
    href: "#",
    iconPath:
      "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  {
    label: "Facebook",
    href: "#",
    iconPath:
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
];
