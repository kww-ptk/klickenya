import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { OrderViewModeForm } from "@/components/dashboard/menu/OrderViewModeForm";
import { ToastProvider } from "@/components/ui/Toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MenuSettingsPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, order_view_mode")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F4F1EC] p-6">
        <header className="mb-6">
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest">{menu.name}</p>
          <h1 className="font-display text-[22px] font-bold text-[#16130C]">Order screen</h1>
        </header>
        <OrderViewModeForm
          menuId={menu.id}
          initialMode={(menu.order_view_mode as "combined" | "split") ?? "combined"}
        />
      </div>
    </ToastProvider>
  );
}
