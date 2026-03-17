import type { Metadata } from "next";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import { PortableText } from "@portabletext/react";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Klickenya collects, uses, and protects your personal information when you use our platform.",
  alternates: { canonical: "/privacy" },
};

const PRIVACY_QUERY = `*[_type == "page" && slug.current == "privacy"][0]{ title, body }`;

export default async function PrivacyPage() {
  const result = await sanityFetch({ query: PRIVACY_QUERY }).catch(() => ({
    data: null,
  }));
  const page = result.data as { title?: string; body?: any[] } | null;

  return (
    <>
      <Nav />
      <main className="bg-white min-h-screen">
        {/* Hero */}
        <section className="pt-32 pb-12 px-5 md:px-10 text-center">
          <h1 className="font-[family-name:var(--font-bricolage)] text-[clamp(32px,5vw,48px)] font-bold text-zinc-900 tracking-[-0.03em]">
            {page?.title ?? "Privacy Policy"}
          </h1>
          <p className="text-zinc-500 text-[15px] mt-3">
            Last updated: March 2026
          </p>
        </section>

        {/* Content */}
        <section className="max-w-[720px] mx-auto px-5 md:px-10 pb-20">
          {page?.body ? (
            <div className="prose prose-zinc max-w-none prose-headings:font-[family-name:var(--font-bricolage)] prose-headings:tracking-[-0.02em] prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline">
              <PortableText value={page.body} />
            </div>
          ) : (
            <div className="space-y-10 text-[15px] leading-[1.75] text-zinc-700">
              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Information We Collect
                </h2>
                <p className="mb-3">
                  When you use Klickenya, we may collect the following types of
                  information:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Browsing data:</strong> Pages visited, time spent on
                    the platform, device type, browser, and IP address.
                  </li>
                  <li>
                    <strong>Form submissions:</strong> Information you provide
                    when making enquiries, creating an account, or contacting
                    hosts — including your name, email address, phone number, and
                    message content.
                  </li>
                  <li>
                    <strong>Cookies:</strong> Small text files stored on your
                    device to improve your experience and help us understand how
                    the platform is used.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  How We Use Your Information
                </h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Service delivery:</strong> To process your enquiries,
                    connect you with hosts, and facilitate bookings.
                  </li>
                  <li>
                    <strong>Communications:</strong> To send you relevant updates
                    about your enquiries, account notifications, and — with your
                    consent — marketing communications.
                  </li>
                  <li>
                    <strong>Improvements:</strong> To analyse usage patterns,
                    improve the platform, fix bugs, and develop new features.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Cookies
                </h2>
                <p className="mb-3">We use the following types of cookies:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Essential cookies:</strong> Required for the platform
                    to function properly, including authentication and session
                    management.
                  </li>
                  <li>
                    <strong>Analytics cookies:</strong> Help us understand how
                    visitors interact with the platform so we can improve the
                    experience.
                  </li>
                </ul>
                <p className="mt-3">
                  You can manage cookie preferences through your browser
                  settings. Disabling essential cookies may affect platform
                  functionality.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Third-Party Services
                </h2>
                <p className="mb-3">
                  We use trusted third-party services to operate the platform:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Sanity:</strong> Content management system for
                    listings and editorial content.
                  </li>
                  <li>
                    <strong>Supabase:</strong> Database and authentication
                    services.
                  </li>
                  <li>
                    <strong>Vercel Analytics:</strong> Privacy-focused web
                    analytics to understand site performance.
                  </li>
                  <li>
                    <strong>Resend:</strong> Transactional email delivery for
                    enquiry confirmations and notifications.
                  </li>
                </ul>
                <p className="mt-3">
                  These services may process your data in accordance with their
                  own privacy policies. We only share the minimum data necessary
                  for each service to function.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Data Retention
                </h2>
                <p>
                  We retain your personal information for as long as necessary to
                  provide our services and fulfil the purposes outlined in this
                  policy. Enquiry data is retained for up to 24 months after
                  your last interaction. You may request deletion of your data at
                  any time by contacting us.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Your Rights
                </h2>
                <p className="mb-3">
                  You have the following rights regarding your personal data:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Access:</strong> Request a copy of the personal data
                    we hold about you.
                  </li>
                  <li>
                    <strong>Correction:</strong> Request that we correct any
                    inaccurate or incomplete data.
                  </li>
                  <li>
                    <strong>Deletion:</strong> Request that we delete your
                    personal data, subject to any legal obligations we may have
                    to retain it.
                  </li>
                </ul>
                <p className="mt-3">
                  To exercise any of these rights, please contact us using the
                  details below.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Contact Us
                </h2>
                <p>
                  If you have any questions about this Privacy Policy or how we
                  handle your data, please contact us at{" "}
                  <a
                    href="mailto:hello@klickenya.com"
                    className="text-amber-600 hover:underline"
                  >
                    hello@klickenya.com
                  </a>
                  .
                </p>
              </section>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
