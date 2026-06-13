import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPartnerByHost } from "@/lib/partner/resolve";
import { getRestaurant } from "@/lib/storefront/getRestaurant";
import { RestaurantStorefront } from "@/components/storefront/RestaurantStorefront";

export async function generateMetadata(): Promise<Metadata> {
  const partner = await getPartnerByHost();
  if (!partner) return {};

  const restaurant = await getRestaurant(partner);
  const description = restaurant?.listing.cuisine?.join(", ") ?? partner.name;

  return {
    title: partner.name,
    description,
    ...(partner.favicon?.url ? { icons: { icon: partner.favicon.url } } : {}),
  };
}

export default async function StorefrontPage() {
  const partner = await getPartnerByHost();
  if (!partner) notFound();
  return <RestaurantStorefront partner={partner} />;
}
