import { OrderStatusClient } from "./OrderStatusClient";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage(props: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { orderId } = await props.params;
  return <OrderStatusClient orderId={orderId} />;
}
