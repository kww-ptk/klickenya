import { redirect } from "next/navigation";

/**
 * The first cut of this page was a single table. It grew into /admin/eat,
 * which has the same orders plus riders, restaurants and the money. Anyone
 * holding the old link lands in the right place.
 */
export default function LegacyFoodDeliveryPage() {
  redirect("/admin/eat/orders");
}
