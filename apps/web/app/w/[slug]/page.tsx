import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPartnerBySlug } from "@/lib/partner/resolve";
import { getRestaurant } from "@/lib/storefront/getRestaurant";
import { RestaurantStorefront } from "@/components/storefront/RestaurantStorefront";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const partner = await getPartnerBySlug(slug);
  if (!partner) return {};

  const restaurant = await getRestaurant(partner);
  const description = restaurant?.listing.cuisine?.join(", ") ?? partner.name;

  return {
    title: partner.name,
    description,
    ...(partner.favicon?.url ? { icons: { icon: partner.favicon.url } } : {}),
  };
}

export default async function WStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = await getPartnerBySlug(slug);
  if (!partner) notFound();
  return <RestaurantStorefront partner={partner} />;
}
