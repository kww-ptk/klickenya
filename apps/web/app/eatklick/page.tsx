import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import { EAT_RESTAURANTS_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { getMenuCapabilities, getMenusWithItems } from "@/lib/eat/menus";
import { EatKlickFlow, type Place, type Town } from "./_components/EatKlickFlow";

/**
 * /eatklick — TEST SCREEN, not linked from anywhere.
 *
 * A single-screen, three-step flow: town → category → browse. Exists to try
 * the "one screen, no scrolling" shape before deciding whether /eat adopts it.
 *
 * Only Restaurant has inventory. Grocery, Pharmacy and Liquor are real
 * intentions with no listings behind them, so they are selectable but land on
 * an honest empty state — the alternative is a category that looks live and
 * returns nothing.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Klick — order on the coast",
  description: "Pick your town, pick what you need, browse what's open.",
  robots: { index: false, follow: false }, // test surface
};

type Listing = {
  _id: string;
  title?: string;
  slug?: { current?: string } | string;
  city?: string;
  cuisine?: string[];
  priceRange?: string;
  openingHours?: string;
  isVerified?: boolean;
  coverPhoto?: unknown;
};

const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

export default async function EatKlickPage() {
  let listings: Listing[] = [];
  try {
    const { data } = await sanityFetch<Listing[]>({ query: EAT_RESTAURANTS_QUERY });
    listings = data ?? [];
  } catch (err) {
    console.error("[/eatklick] Sanity fetch error:", err);
  }

  const [caps, menus] = await Promise.all([
    getMenuCapabilities(),
    getMenusWithItems(),
  ]);

  const places: Place[] = listings.map((l) => {
    const slug = typeof l.slug === "string" ? l.slug : (l.slug?.current ?? "");
    const cap = caps.get(slug);
    const menu = menus.get(slug);
    return {
      id: l._id,
      name: l.title ?? "Untitled",
      town: toSlug(l.city ?? ""),
      category: "restaurant",
      cuisine: l.cuisine ?? [],
      priceRange: l.priceRange,
      openingHours: l.openingHours,
      isVerified: Boolean(l.isVerified),
      photo: l.coverPhoto ? urlForImage(l.coverPhoto).width(600).url() : "",
      href: `/restaurants/${toSlug(l.city ?? "")}/${slug}`,
      orderHref: cap?.canOrder && cap.menuSlug ? `/m/${cap.menuSlug}` : undefined,
      canBook: Boolean(cap?.canBook),
      foodTags: menu?.foodTags ?? [],
      menu: menu?.sections ?? [],
      menuId: menu?.menuId ?? "",
      menuSlug: menu?.menuSlug ?? "",
      whatsappPhone: cap?.whatsappPhone ?? "",
    };
  });

  // Towns come from the listings themselves, so a town never appears empty.
  const counts = new Map<string, { label: string; n: number }>();
  for (const l of listings) {
    const label = (l.city ?? "").trim();
    if (!label) continue;
    const key = toSlug(label);
    const existing = counts.get(key);
    if (existing) existing.n += 1;
    else counts.set(key, { label, n: 1 });
  }
  const towns: Town[] = [...counts.entries()]
    .map(([slug, v]) => ({ slug, label: v.label, count: v.n }))
    .sort((a, b) => b.count - a.count);

  return <EatKlickFlow towns={towns} places={places} />;
}
