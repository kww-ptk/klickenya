import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Klickenya Kitchen lives under /dashboard/menu/[menu.id]/stock. This page
 * exists so the listing-dashboard tab nav has a target at
 * /dashboard/listings/[id]/kitchen — we resolve the menu and 308 over.
 *
 * Most navigation comes through the Overview Quick Access card which
 * links directly to /dashboard/menu/[menu.id]/stock. This redirect is the
 * fallback for tab clicks and direct URLs.
 */
export default async function KitchenRedirectPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const listing = await sanityClient.fetch<{ slug: string } | null>(
    `*[_id == $id && (_type == "listing" || _type == "event")][0]{ "slug": slug.current }`,
    { id },
  );
  if (!listing?.slug) redirect(`/dashboard/listings/${id}`);

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, stock_enabled")
    .eq("listing_slug", listing.slug)
    .eq("business_id", user.id)
    .maybeSingle();

  if (!menu) redirect(`/dashboard/listings/${id}`);
  if (!menu.stock_enabled) redirect(`/dashboard/menu/${menu.id}/stock`);

  redirect(`/dashboard/menu/${menu.id}/stock`);
}
