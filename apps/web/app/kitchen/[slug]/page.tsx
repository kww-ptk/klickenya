import { redirect } from "next/navigation";

/**
 * The order tablet used to live at /kitchen/<slug>.
 *
 * Renamed because "kitchen" already meant something else here: the Kitchen
 * tab in the dashboard is Klickenya Kitchen — stock, recipes, costing. Two
 * different things sharing a word is how an owner ends up on the wrong screen.
 *
 * This stays so tablets already bookmarked to the old URL keep working. It is
 * not a route anyone should link to.
 */
export default async function LegacyKitchenRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/tablet/${slug}`);
}
