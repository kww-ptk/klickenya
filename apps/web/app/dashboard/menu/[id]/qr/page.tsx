import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { getMenuForQR } from "@/lib/cache/menu";
import { QRDownload } from "@/components/dashboard/menu/QRDownload";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QRPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();

  if (!user) redirect("/login");

  const menu = await getMenuForQR(id, user.id);

  if (!menu) redirect("/dashboard/menus");

  return (
    <QRDownload
      menu={menu as {
        id: string;
        slug: string;
        display_name: string | null;
        listing_slug: string | null;
        is_published: boolean;
      }}
    />
  );
}
