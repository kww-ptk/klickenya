import { redirect } from "next/navigation";

/** Was the whole-order queue; now the tablet's main screen. */
export default async function LegacyDeliveriesRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/tablet/${slug}/orders`);
}
