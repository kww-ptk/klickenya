import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import type { MenuData } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuBuilder } from "@/components/dashboard/menu/MenuBuilder";
import { ToastProvider } from "@/components/ui/Toast";

interface PageProps {
  params: Promise<{ id: string; menuId: string }>;
}

export default async function AdminMenuBuilderPage({ params }: PageProps) {
  const { id, menuId } = await params;

  // Admin auth is handled by the admin layout — no extra check needed
  // Fetch menu without ownership filter (admin can edit any menu)
  const { data: menu } = await adminClient
    .from("menus")
    .select(
      `
      id, slug, name, is_published, table_ordering, listing_slug,
      menu_sections (
        id, title, display_order, is_visible, station,
        menu_items (
          id, name, description, price_kes,
          dietary_tags, is_available, is_featured, display_order, photo_url
        )
      )
    `
    )
    .eq("id", menuId)
    .single();

  if (!menu) redirect(`/admin/hosts/${id}`);

  // Resolve Sanity listing _id so MenuBuilder can link to the listing command center
  let listingId: string | null = null;
  if (menu.listing_slug) {
    const sanityListing = await sanityClient
      .fetch<{ _id: string } | null>(
        `*[_type == "listing" && slug.current == $slug][0]{ _id }`,
        { slug: menu.listing_slug },
      )
      .catch(() => null);
    listingId = sanityListing?._id ?? null;
  }

  // Fetch scan count (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: scanCount } = await adminClient
    .from("menu_scans")
    .select("id", { count: "exact", head: true })
    .eq("menu_id", menu.id)
    .gte("scanned_at", sevenDaysAgo);

  return (
    <ToastProvider>
      <MenuBuilder
        menu={menu as MenuData}
        scanCount={scanCount ?? 0}
        tableOrdering={menu.table_ordering ?? false}
        listingId={listingId ?? undefined}
        backHref={`/admin/hosts/${id}`}
        backLabel="← Back to host"
      />
    </ToastProvider>
  );
}
