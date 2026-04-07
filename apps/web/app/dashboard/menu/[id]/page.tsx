import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import type { MenuData } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuBuilder } from "@/components/dashboard/menu/MenuBuilder";
import { ToastProvider } from "@/components/ui/Toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MenuBuilderPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();

  if (!user) redirect("/login");

  // Fetch menu by UUID with ownership check at DB level
  const { data: menu } = await adminClient
    .from("menus")
    .select(
      `
      id, slug, name, is_published, table_ordering,
      menu_sections (
        id, title, display_order, is_visible,
        menu_items (
          id, name, description, price_kes,
          dietary_tags, is_available, display_order, photo_url
        )
      )
    `
    )
    .eq("id", id)
    .eq("business_id", user.id)
    .single();

  if (!menu) redirect("/dashboard");

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
      />
    </ToastProvider>
  );
}
