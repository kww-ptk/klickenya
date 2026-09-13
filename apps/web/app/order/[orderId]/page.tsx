import type { Metadata } from "next";
import { OrderStatusClient } from "../../m/[slug]/order/[orderId]/OrderStatusClient";

export const dynamic = "force-dynamic";

// The order id is the secret — a v4 UUID, not guessable. Keep it out of
// search results all the same: nothing here should ever be indexed.
export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

/**
 * /order/[orderId] — the short tracking URL handed to the guest.
 *
 * The same screen already lived at /m/[slug]/order/[orderId], which needs the
 * restaurant slug the guest has no reason to know or type. This is the link
 * that goes into the WhatsApp message, so it is as short as it can be while
 * still being unguessable, and it works on both hosts.
 */
export default async function ShortOrderStatusPage(props: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await props.params;
  return <OrderStatusClient orderId={orderId} />;
}
