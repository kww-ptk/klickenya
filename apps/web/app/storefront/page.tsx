import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPartnerByHost } from "@/lib/partner/resolve";
import { getRestaurant, type StorefrontMenu } from "@/lib/storefront/getRestaurant";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import { MenuWithFilters } from "@/components/menu/MenuWithFilters";
import type { MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";

/* ── Metadata ───────────────────────────────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  const partner = await getPartnerByHost();
  if (!partner) return {};

  const restaurant = await getRestaurant(partner);
  const description = restaurant?.listing.cuisine?.join(", ") ?? partner.name;

  return {
    title: partner.name,
    description,
    ...(partner.favicon?.url
      ? { icons: { icon: partner.favicon.url } }
      : {}),
  };
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Mirrors the prepareSections() logic from /m/[slug]/page.tsx:
 *   1. Drop sections that are hidden or have no items.
 *   2. Sort sections by display_order.
 *   3. Within each section sort items: available first, then by display_order.
 *   4. Null-safe dietary_tags (M1 — MenuWithFilters calls .length/.map on it).
 */
function prepareSections(rawSections: StorefrontMenu["menu_sections"]): MenuSection[] {
  return rawSections
    .filter((s) => s.is_visible && s.menu_items.length > 0)
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => ({
      ...s,
      menu_items: [...s.menu_items]
        .sort((a, b) => {
          if (a.is_available !== b.is_available) return a.is_available ? -1 : 1;
          return a.display_order - b.display_order;
        })
        .map((item) => ({
          ...item,
          dietary_tags: item.dietary_tags ?? [],
        })),
    })) as unknown as MenuSection[];
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function StorefrontPage() {
  const partner = await getPartnerByHost();
  if (!partner) notFound();

  const restaurant = await getRestaurant(partner);
  if (!restaurant) notFound();

  const { listing, menu, areas, timeWindows, restaurantPhone } = restaurant;

  const heroPhoto = listing.photos?.[0] ?? null;

  // Build a short summary line for the hero
  const metaParts: string[] = [];
  if (listing.cuisine?.length) metaParts.push(listing.cuisine.join(", "));
  if (listing.city) metaParts.push(listing.city);
  if (listing.openingHours) metaParts.push(listing.openingHours);

  // Prepare sections: filter hidden/empty, sort, null-safe dietary_tags.
  const sections = prepareSections(menu?.menu_sections ?? []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ── Hero ── */}
      <section className="mb-8">
        {heroPhoto?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroPhoto.url}
            alt={heroPhoto.alt ?? listing.title}
            className="w-full h-56 sm:h-72 object-cover rounded-2xl mb-5"
          />
        )}

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-dark leading-tight mb-1">
              {listing.title}
            </h1>
            {metaParts.length > 0 && (
              <p className="text-[14px] text-text2">
                {metaParts.join(" · ")}
              </p>
            )}
          </div>

          {menu?.reservations_enabled && (
            <ReservationSheet
              menuId={menu.id}
              menuName={menu.name}
              source="storefront"
              timeWindows={timeWindows}
              areas={areas}
              maxPartySize={menu.reservations_max_party_size}
              maxAdvanceDays={menu.reservations_max_advance_days}
              leadTimeHours={menu.reservations_lead_time_hours}
              restaurantPhone={restaurantPhone}
              triggerLabel="Book a table"
            />
          )}
        </div>
      </section>

      {/* ── Menu ── */}
      {menu && sections.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-dark mb-4">Menu</h2>
          <MenuWithFilters sections={sections} />
        </section>
      )}

      {/* Empty state — menu not yet published */}
      {(!menu || sections.length === 0) && (
        <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-text2">Menu coming soon</p>
          <p className="text-[13px] text-text3 mt-1">{listing.title} hasn&apos;t published their menu yet.</p>
        </div>
      )}
    </div>
  );
}
