import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getPosMenuBySlug } from "@/app/pos/[slug]/_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { PosLogin } from "@/components/pos/PosLogin";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Kitchen PIN entry. Reuses the waiter PIN component with a different label
 * and post-sign-in destination. Signing in here sets the same staff cookie
 * as the waiter terminal — the orders page enforces the kitchen-or-manager
 * role separately.
 */
export default async function KitchenLoginPage({ params }: PageProps) {
  const { slug } = await params;

  const menu = await getPosMenuBySlug(slug);
  if (!menu) return null;

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (session && session.menu_id === menu.id) {
    if (session.role === "kitchen" || session.role === "manager") {
      redirect(`/kitchen/${slug}/orders`);
    }
    // Already signed in as a waiter/cashier — bounce to the POS terminal
    // they're authorised for instead of trapping them on a login screen.
    redirect(`/pos/${slug}/tables`);
  }

  return (
    <PosLogin
      slug={slug}
      menuId={menu.id}
      menuName={menu.name}
      contextLabel="Kitchen Terminal"
      redirectTo={`/kitchen/${slug}/orders`}
    />
  );
}
