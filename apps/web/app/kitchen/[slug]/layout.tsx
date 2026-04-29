import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { getPosMenuBySlug } from "@/app/pos/[slug]/_lib/menuFromSlug";

/**
 * Kitchen terminal layout. Mirrors /pos/[slug]/layout.tsx but trimmer:
 *   - Same dark, full-bleed, no-chrome look so it can be docked to a tablet.
 *   - No PosShellProvider — the kitchen view doesn't need menu sections,
 *     staff context, or the realtime/cache machinery the waiter UI uses.
 *   - Auth gating happens per-page: the login page renders the PIN, the
 *     orders page (and any future kitchen pages) verify the cookie + role.
 */

export const metadata: Metadata = {
  title: "Kitchen · Klickenya",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor:   "#16130C",
};

interface LayoutProps {
  params:   Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function KitchenLayout({ params, children }: LayoutProps) {
  const { slug } = await params;
  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  return (
    <div className="min-h-screen bg-[#0F0D08] text-[#F4F1EC] antialiased select-none">
      {children}
    </div>
  );
}
