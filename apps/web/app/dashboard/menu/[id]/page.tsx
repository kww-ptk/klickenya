import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuTree } from "@/lib/cache/menu";
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

  // Fetch menu tree (cached) + scan count (uncached, live) in parallel
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [menu, { count: scanCount }] = await Promise.all([
    getMenuTree(id, user.id),
    adminClient
      .from("menu_scans")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", id)
      .gte("scanned_at", sevenDaysAgo),
  ]);

  if (!menu) redirect("/dashboard");

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
