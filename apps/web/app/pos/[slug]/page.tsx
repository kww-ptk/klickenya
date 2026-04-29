import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getPosMenuBySlug } from "./_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { PosLogin } from "@/components/pos/PosLogin";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PosLoginPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  // Already signed in for this menu? Skip straight to tables.
  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (session && session.menu_id === menu.id) {
    redirect(`/pos/${slug}/tables`);
  }

  return (
    <PosLogin
      slug={slug}
      menuId={menu.id}
      menuName={menu.name}
    />
  );
}
