import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata, Viewport } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { getPosMenuBySlug } from "./_lib/menuFromSlug";
import { fetchPosMenu } from "./_lib/posMenu";
import { PosShellProvider } from "@/components/pos/_shell/PosShellProvider";
// computeMenuVersion is a pure helper that lives in menuCache.ts. Import it
// directly here — re-exporting it through the "use client" PosShellProvider
// makes the server-side call illegal under Next.js 16's strict server/client
// boundary enforcement.
import { computeMenuVersion } from "@/components/pos/_shell/menuCache";

export const metadata: Metadata = {
  title: "POS Terminal · Klickenya",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor:   "#16130C",
};

/**
 * The POS terminal lives in its own layout with no dashboard chrome:
 * no sidebar, no listing nav, no MobileBottomNav (filtered in
 * MobileBottomNav.tsx via the /pos prefix). Tablet-optimised, full screen.
 *
 * The layout is async so it can resolve the menu identity, validate the staff
 * session cookie, and (if signed in) preload the full menu sections. All
 * three are passed into the client-side <PosShellProvider> so child pages
 * read them from context instead of re-fetching on every navigation. That
 * eliminates the slow flicker between Tables ↔ Session detail.
 *
 * On the login page (no staff cookie or invalid cookie), we deliberately skip
 * the heavier menu fetch — saves ~50–200 KB on what's just a PIN screen.
 */
interface LayoutProps {
  params:   Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function PosLayout({ params, children }: LayoutProps) {
  const { slug } = await params;

  // Parallelise the two independent root awaits: slug → menu lookup, and the
  // cookie store. They don't depend on each other.
  const [menu, cookieStore] = await Promise.all([
    getPosMenuBySlug(slug),
    cookies(),
  ]);
  if (!menu) notFound();

  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);

  // If a staff cookie is present, fetch the staff row and the full menu in
  // parallel — they don't depend on each other once we have the menu id, and
  // the menu fetch is the heaviest call on this layout (~50–200 KB).
  // We over-fetch slightly when the cookie turns out invalid (we discard the
  // sections in that case), but the win on the happy path — the only path
  // that matters for waiter UX — is ~150–300 ms shaved off every navigation.
  let staff: { id: string; menu_id: string; name: string; role: "waiter" | "manager" | "cashier" | "kitchen" } | null = null;
  let sections: Awaited<ReturnType<typeof fetchPosMenu>> | null = null;

  if (session && session.menu_id === menu.id) {
    const [staffResult, fetchedSections] = await Promise.all([
      adminClient
        .from("restaurant_staff")
        .select("id, menu_id, name, role, is_active")
        .eq("id", session.staff_id)
        .single(),
      fetchPosMenu(menu.id),
    ]);

    const row = staffResult.data;
    if (row && row.is_active && row.menu_id === menu.id) {
      staff = {
        id:      row.id,
        menu_id: row.menu_id,
        name:    row.name,
        role:    row.role as "waiter" | "manager" | "cashier" | "kitchen",
      };
      sections = fetchedSections;
    }
    // If the staff row is missing or deactivated, sections stay null — we
    // wasted one menu fetch, but the next render will route them to the
    // login page anyway.
  }

  const version = sections ? computeMenuVersion(sections) : null;

  return (
    <div className="min-h-screen bg-[#0F0D08] text-[#F4F1EC] antialiased select-none">
      <PosShellProvider
        menu={{ id: menu.id, slug: menu.slug, name: menu.name }}
        staff={staff}
        serverSections={sections}
        serverMenuVersion={version}
      >
        {children}
      </PosShellProvider>
    </div>
  );
}
