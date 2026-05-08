import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { safeBackHref } from "@/app/dashboard/_lib/back-href";
import { getMenuForQR } from "@/lib/cache/menu";
import { QRDownload } from "@/components/dashboard/menu/QRDownload";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ back?: string }>;
}

export default async function QRPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const backHref = safeBackHref(sp.back);
  const { user } = await getAuthUser();

  if (!user) redirect("/login");

  const menu = await getMenuForQR(id, user.id);

  if (!menu) redirect("/dashboard/menus");

  return (
    <QRDownload
      backHref={backHref ?? undefined}
      menu={menu as {
        id: string;
        slug: string;
        display_name: string | null;
        listing_slug: string | null;
        is_published: boolean;
        table_ordering: boolean;
      }}
    />
  );
}
