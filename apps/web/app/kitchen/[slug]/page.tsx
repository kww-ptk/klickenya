import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getPosMenuBySlug } from "@/app/pos/[slug]/_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { PosLogin } from "@/components/pos/PosLogin";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Kitchen/Bar PIN entry. Reuses the waiter PIN component with a different label
 * and post-sign-in destination. Signing in here sets the same staff cookie
 * as the waiter terminal — the orders page enforces the kitchen/bar/manager
 * role separately. Bar staff also enter through this URL for backwards
 * compatibility (the orders page routes them to their station).
 */
export default async function KitchenLoginPage({ params }: PageProps) {
  const { slug } = await params;

  const menu = await getPosMenuBySlug(slug);
  if (!menu) return null;

  // Where this terminal should land depends on how the restaurant works.
  // A kitchen with no table ordering has no station board worth opening and
  // may have POS switched off entirely — sending its staff to either is a
  // dead end. The whole-order queue is the right home for them.
  const { data: menuModes } = await adminClient
    .from("menus")
    .select("table_ordering, pos_enabled")
    .eq("id", menu.id)
    .maybeSingle();
  const hasTables = Boolean(menuModes?.table_ordering);
  const hasPos = Boolean(menuModes?.pos_enabled);

  const kitchenHome = hasTables ? `/kitchen/${slug}/orders` : `/kitchen/${slug}/deliveries`;

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (session && session.menu_id === menu.id) {
    if (session.role === "kitchen" || session.role === "manager" || session.role === "bar") {
      redirect(kitchenHome);
    }
    // Already signed in as a waiter/cashier. The POS terminal is where they
    // belong when there is one; when there is not, the order queue beats
    // bouncing them to a screen this restaurant does not use.
    redirect(hasPos ? `/pos/${slug}/tables` : `/kitchen/${slug}/deliveries`);
  }

  return (
    <PosLogin
      slug={slug}
      menuId={menu.id}
      menuName={menu.name}
      contextLabel="Kitchen Terminal"
      redirectTo={kitchenHome}
    />
  );
}
