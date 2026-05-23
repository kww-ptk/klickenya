import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { SectionsStationManager } from "@/components/dashboard/menu/SectionsStationManager";
import { ToastProvider } from "@/components/ui/Toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SectionsPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");

  const { data: sections } = await adminClient
    .from("menu_sections")
    .select("id, title, station, display_order")
    .eq("menu_id", menu.id)
    .order("display_order", { ascending: true });

  return (
    <ToastProvider>
      <SectionsStationManager
        menuId={menu.id}
        menuName={menu.name}
        initialSections={(sections ?? []) as Array<{
          id: string; title: string;
          station: "kitchen" | "bar"; display_order: number;
        }>}
      />
    </ToastProvider>
  );
}
