import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { getMenusForOwner } from "@/lib/cache/menu";
import { ToastProvider } from "@/components/ui/Toast";
import { MenusOverview } from "@/components/dashboard/menu/MenusOverview";

interface MenuRow {
  id: string;
  slug: string;
  display_name: string | null;
  listing_slug: string | null;
  is_published: boolean;
  created_at: string;
}

export default async function MenusPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const menus = await getMenusForOwner(user.id);

  return (
    <ToastProvider>
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <Link
              href="/dashboard"
              className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
            >
              ← Back to dashboard
            </Link>
            <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
              My Menus
            </h1>
          </div>
        </div>

        <MenusOverview menus={menus as MenuRow[]} />
      </div>
    </ToastProvider>
  );
}
