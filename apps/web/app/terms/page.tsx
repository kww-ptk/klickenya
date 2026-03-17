import type { Metadata } from "next";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import { PortableText } from "@portabletext/react";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the terms and conditions that govern your use of the Klickenya platform.",
  alternates: { canonical: "/terms" },
};

const TERMS_QUERY = `*[_type == "page" && slug.current == "terms"][0]{ title, body }`;

export default async function TermsPage() {
  const result = await sanityFetch({ query: TERMS_QUERY }).catch(() => ({
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
            {page?.title ?? "Terms of Service"}
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
                  Acceptance of Terms
                </h2>
                <p>
                  By accessing or using the Klickenya platform (&ldquo;the
                  Service&rdquo;), you agree to be bound by these Terms of
                  Service. If you do not agree with any part of these terms, you
                  should not use the Service. We may update these terms from time
                  to time, and your continued use of the Service constitutes
                  acceptance of any changes.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Description of Service
                </h2>
                <p>
                  Klickenya is an online marketplace that connects travellers and
                  locals with stays, experiences, restaurants, events, rentals,
                  services, and real estate listings across Kenya. We provide a
                  platform for hosts and service providers to showcase their
                  offerings, and for users to discover and enquire about them.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  User Responsibilities
                </h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Accurate information:</strong> You agree to provide
                    accurate, current, and complete information when using the
                    platform, including when making enquiries or creating an
                    account.
                  </li>
                  <li>
                    <strong>Lawful use:</strong> You agree to use the Service
                    only for lawful purposes and in accordance with these terms.
                    You must not use the platform to engage in any fraudulent,
                    harmful, or illegal activity.
                  </li>
                  <li>
                    <strong>Account security:</strong> If you create an account,
                    you are responsible for maintaining the security of your
                    login credentials and for all activity that occurs under your
                    account.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Enquiries &amp; Communications
                </h2>
                <p>
                  Klickenya currently operates on an enquiry-based system. When
                  you submit an enquiry about a listing, your contact details and
                  message are shared with the relevant host or service provider
                  so they can respond to you directly. Klickenya does not
                  currently process direct bookings or payments through the
                  platform. All booking arrangements and payments are made
                  directly between you and the host.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Listings
                </h2>
                <p>
                  Hosts and service providers are solely responsible for the
                  accuracy, legality, and quality of their listings. Klickenya
                  reviews listings before they are published to maintain quality
                  standards, but we do not guarantee the accuracy of any listing
                  content. We reserve the right to remove or modify any listing
                  that violates these terms or our content guidelines.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Intellectual Property
                </h2>
                <p>
                  All content on the Klickenya platform — including text,
                  graphics, logos, icons, images, and software — is the property
                  of Klickenya or its content suppliers and is protected by
                  applicable intellectual property laws. You may not reproduce,
                  distribute, modify, or create derivative works from any content
                  on the platform without our prior written consent.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Limitation of Liability
                </h2>
                <p>
                  Klickenya acts as an intermediary platform connecting users
                  with hosts and service providers. To the fullest extent
                  permitted by law, Klickenya shall not be liable for any
                  indirect, incidental, special, consequential, or punitive
                  damages arising out of or related to your use of the Service,
                  including but not limited to the quality, safety, or legality
                  of any listing or the conduct of any host or user.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Changes to Terms
                </h2>
                <p>
                  We reserve the right to modify these Terms of Service at any
                  time. Changes will be posted on this page with an updated
                  &ldquo;Last updated&rdquo; date. Your continued use of the
                  Service after changes are posted constitutes acceptance of the
                  revised terms.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Governing Law
                </h2>
                <p>
                  These Terms of Service shall be governed by and construed in
                  accordance with the Laws of Kenya. Any disputes arising from
                  or related to these terms or your use of the Service shall be
                  subject to the exclusive jurisdiction of the courts of Kenya.
                </p>
              </section>

              <section>
                <h2 className="font-[family-name:var(--font-bricolage)] text-[22px] font-bold text-zinc-900 tracking-[-0.02em] mb-4">
                  Contact Us
                </h2>
                <p>
                  If you have any questions about these Terms of Service, please
                  contact us at{" "}
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
