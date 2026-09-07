import type { Metadata } from "next";

/**
 * `page.tsx` in this directory is a client component, so it cannot export
 * metadata itself. Without this layout the page inherited the root default and
 * every property submission page rendered as "Klickenya — Discover Kenya" with
 * no description, which matters now that it is the destination of the CTAs in
 * /journal/where-to-list-house-for-sale-in-kenya.
 *
 * Titles here omit the "| Klickenya" suffix on purpose: the root layout applies
 * `template: "%s | Klickenya"`, so adding it again produces a doubled brand.
 */
export const metadata: Metadata = {
  title: "List Your Property",
  description:
    "List your house, apartment, land or development on Klickenya. Free to list, no commission, and prices in shillings, euro, dollars or pounds.",
  alternates: {
    canonical: "https://klickenya.com/real-estate/list",
  },
  openGraph: {
    title: "List Your Property | Klickenya",
    description:
      "Free property listing for owners, agents and developers in Kenya. No commission, and multi currency pricing built for the coast.",
    url: "https://klickenya.com/real-estate/list",
    type: "website",
  },
};

export default function RealEstateListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
