import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Bricolage_Grotesque } from "next/font/google";
import { VisualEditing } from "next-sanity/visual-editing";
import { SanityLive } from "@/lib/sanity/client";
import { cookies, draftMode } from "next/headers";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import {
  CurrencyProvider,
  CURRENCY_COOKIE,
} from "@/components/currency/CurrencyProvider";
import { getRates } from "@/lib/currency/rates";
import { CityCountsProvider } from "@/context/CityCountsContext";
import { SavedListingsProvider } from "@/hooks/useSavedListings";
import { getCityCounts } from "@/lib/sanity/getCityCounts";
import { SITE_URL } from "@/lib/seo/site";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "Klickenya — Discover Kenya",
    template: "%s | Klickenya",
  },
  description:
    "Kenya's all-in-one booking platform. Book stays, experiences, events, rentals and services — from Nairobi to Lamu, Mara to Mombasa.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  // Without max-image-preview:large Google may show a thumbnail-sized preview
  // or none at all, whatever og:image says. Every image-led page on this site
  // depends on the large preview.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Klickenya",
  url: SITE_URL,
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/stays?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Klickenya",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
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
  const [{ isEnabled: isDraftMode }, cityCounts, rates, cookieStore] =
    await Promise.all([draftMode(), getCityCounts(), getRates(), cookies()]);

  const currencyPreference = cookieStore.get(CURRENCY_COOKIE)?.value;

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
        <SavedListingsProvider>
        <CityCountsProvider cityCounts={cityCounts}>
          {/* System wide on purpose: stays, events and tickets can adopt the
              same preference by calling useDisplayCurrency. Only the
              real-estate surfaces read it today. */}
          <CurrencyProvider
            initialCurrency={currencyPreference}
            rates={rates.kesPer}
            ratesUpdatedAt={rates.updatedAt}
            isLive={rates.source === "live"}
          >
            {children}
          </CurrencyProvider>
          <MobileBottomNav />
        </CityCountsProvider>
        </SavedListingsProvider>
        <SanityLive />
        {isDraftMode && <VisualEditing />}
      </body>
    </html>
  );
}
