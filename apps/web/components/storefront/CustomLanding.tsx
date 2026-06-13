import { renderLandingHtml } from "@/lib/storefront/renderTokens";
import type { Partner } from "@/lib/partner/types";
import type { StorefrontRestaurant } from "@/lib/storefront/getRestaurant";

export function CustomLanding({
  partner,
  restaurant,
}: {
  partner: Partner;
  restaurant: StorefrontRestaurant | null;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
  const html = renderLandingHtml(partner.landingHtml ?? "", {
    menuSlug: restaurant?.menu?.slug ?? null,
    menuSections: restaurant?.menu?.menu_sections ?? null,
    accentHex: partner.colorPrimary ?? null,
    siteUrl,
  });
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
