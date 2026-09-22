import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import { eatOrigin } from "@/lib/storefront/houseHost";
import { EAT_RESTAURANTS_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import {
  getMenuCapabilities,
  getMenusWithItems,
  getReservationConfigs,
  isOrderable,
} from "@/lib/eat/menus";
import { EatKlickFlow, type Place, type Town } from "./_components/EatKlickFlow";

/**
 * The food app — served at the ROOT of eat.klickenya.com.
 *
 * Middleware rewrites eat.klickenya.com/ to this route and 308s the bare
 * /eatklick path back to "/", so the flow has exactly one public URL. On the
 * marketplace host /eatklick 308s to the subdomain for the same reason.
 *
 * A single screen, three steps: town → category → browse.
 *
 * Only Restaurant has inventory. Grocery, Pharmacy and Liquor are real
 * intentions with no listings behind them, so they are selectable but land on
 * an honest empty state — the alternative is a category that looks live and
 * returns nothing.
 */

export const revalidate = 3600;

// Canonical follows wherever the app actually lives. metadataBase is
// klickenya.com (the marketplace), so once the subdomain is live the canonical
// has to be absolute or it points at the wrong host. Until then the relative
// path is correct — and pointing at a host that does not resolve yet would be
// worse than not having a subdomain at all.
const EAT_ORIGIN = eatOrigin();
// Trailing slash so the canonical is byte-identical to the URL actually
// served at the subdomain root.
const CANONICAL = EAT_ORIGIN ? `${EAT_ORIGIN}/` : "/eatklick";

export const metadata: Metadata = {
  // Bare title: the root layout applies template "%s | Klickenya". Spelling
  // the brand here too renders "... | Klickenya | Klickenya".
  title: "Food delivery in Watamu & Kilifi — order online",
  description:
    "Order food for delivery or pickup in Watamu and Kilifi. Browse menus from local restaurants, see what's open now, and order in a few taps.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Food delivery in Watamu & Kilifi",
    description:
      "Browse menus from local restaurants, see what's open now, and order in a few taps.",
    url: CANONICAL,
    siteName: "Klickenya Eat",
    type: "website",
  },
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

  const [caps, menus, reservations] = await Promise.all([
    getMenuCapabilities(),
    getMenusWithItems(),
    getReservationConfigs(),
  ]);

  // Tighter than /eat's gate: this flow is the ordering app, so a book-only
  // kitchen would show "+" buttons on a menu nobody can order from. Town
  // counts are derived from this same filtered set, so they always agree
  // with the cards.
  listings = listings.filter((l) => {
    const slug = typeof l.slug === "string" ? l.slug : (l.slug?.current ?? "");
    return isOrderable(caps.get(slug));
  });

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
      canDeliver: Boolean(cap?.canDeliver),
      canOrder: Boolean(cap?.canOrder),
      deliveryFeeKes: cap?.deliveryFeeKes ?? 0,
      minOrderKes: cap?.minOrderKes ?? null,
      reservation: reservations.get(slug) ?? null,
      foodTags: menu?.foodTags ?? [],
      menu: menu?.sections ?? [],
      menuId: menu?.menuId ?? "",
      menuSlug: menu?.menuSlug ?? "",
      whatsappPhone: cap?.whatsappPhone ?? "",
    };
  });

  // Towns come from the listings themselves, so a town never appears empty.
  const counts = new Map<string, { label: string; n: number; photo: string }>();
  for (const l of listings) {
    const label = (l.city ?? "").trim();
    if (!label) continue;
    const key = toSlug(label);
    const photo = l.coverPhoto ? urlForImage(l.coverPhoto).width(600).url() : "";
    const existing = counts.get(key);
    if (existing) {
      existing.n += 1;
      if (!existing.photo) existing.photo = photo;
    } else {
      counts.set(key, { label, n: 1, photo });
    }
  }
  const towns: Town[] = [...counts.entries()]
    .map(([slug, v]) => ({ slug, label: v.label, count: v.n, photo: v.photo }))
    .sort((a, b) => b.count - a.count);

  return <EatKlickFlow towns={towns} places={places} />;
}
