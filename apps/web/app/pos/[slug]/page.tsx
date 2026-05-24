import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getPosMenuBySlug } from "./_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { PosLogin } from "@/components/pos/PosLogin";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PosLoginPage({ params }: PageProps) {
  const { slug } = await params;

  // The layout has already validated the menu (and notFound'd if missing) but
  // we still need the menu identity here to make the redirect-on-already-
  // signed-in check work without going through context.
  const menu = await getPosMenuBySlug(slug);
  if (!menu) return null; // layout will have already 404'd; defensive

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (session && session.menu_id === menu.id) {
    // Kitchen and bar staff have no use for the waiter tables grid — they
    // never take orders, they only prepare incoming items. Route them to the
    // station dashboard, which will further route bar → /orders/bar and
    // kitchen → /orders/kitchen (or render the tabbed combined view).
    if (session.role === "kitchen" || session.role === "bar") {
      redirect(`/kitchen/${slug}/orders`);
    }
    redirect(`/pos/${slug}/tables`);
  }

  return <PosLogin slug={slug} menuId={menu.id} menuName={menu.name} />;
}
