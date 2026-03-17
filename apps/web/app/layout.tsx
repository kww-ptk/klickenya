import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Bricolage_Grotesque } from "next/font/google";
import { VisualEditing } from "next-sanity/visual-editing";
import { SanityLive } from "@/lib/sanity/client";
import { draftMode } from "next/headers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Klickenya — Discover Kenya",
    template: "%s | Klickenya",
  },
  description:
    "Kenya's all-in-one booking platform. Book stays, experiences, events, rentals and services — from Nairobi to Lamu, Mara to Mombasa.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://klickenya.com"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Klickenya — Discover Kenya",
    description:
      "Kenya's all-in-one booking platform. Book stays, experiences, events, rentals and services — from Nairobi to Lamu, Mara to Mombasa.",
    siteName: "Klickenya",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Klickenya — Discover Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klickenya — Discover Kenya",
    description:
      "Kenya's all-in-one booking platform. Book stays, experiences, events, rentals and services — from Nairobi to Lamu, Mara to Mombasa.",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Klickenya",
  url: "https://klickenya.com",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://klickenya.com/stays?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Klickenya",
  url: "https://klickenya.com",
  logo: "https://klickenya.com/logo.png",
  sameAs: [
    "https://twitter.com/klickenya",
    "https://www.instagram.com/klickenya",
    "https://www.facebook.com/klickenya",
    "https://www.linkedin.com/company/klickenya",
    "https://www.tiktok.com/@klickenya",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body
        className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} antialiased`}
      >
        {children}
        <SanityLive />
        {isDraftMode && <VisualEditing />}
      </body>
    </html>
  );
}
