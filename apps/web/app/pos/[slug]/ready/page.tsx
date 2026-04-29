import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getPosMenuBySlug } from "../_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { PosReadyOrders } from "@/components/pos/PosReadyOrders";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Waiter "Ready" tab. Shows orders that have come back from the kitchen
 * (status = "ready") for this menu. Tapping "Mark delivered" closes the
 * order. Auth: any signed-in waiter / manager / cashier — kitchen role
 * has its own /kitchen/[slug] view and is bounced from here.
 */
export default async function PosReadyPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) {
    redirect(`/pos/${slug}`);
  }
  if (session.role === "kitchen") {
    redirect(`/kitchen/${slug}/orders`);
  }

  return <PosReadyOrders staffId={session.staff_id} />;
}
