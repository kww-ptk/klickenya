import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Kitchen view (table-ordering live screen) lives under
 * /dashboard/menu/[menu.id]/orders. This page exists so the listing-
 * dashboard tab nav has a target at /dashboard/listings/[id]/orders.
 */
export default async function OrdersRedirectPage({ params }: PageProps) {
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
    .select("id")
    .eq("listing_slug", listing.slug)
    .eq("business_id", user.id)
    .maybeSingle();
  if (!menu) redirect(`/dashboard/listings/${id}`);

  redirect(`/dashboard/menu/${menu.id}/orders`);
}
