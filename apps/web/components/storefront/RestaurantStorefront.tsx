import { notFound } from "next/navigation";
import type { PortableTextBlock } from "@portabletext/react";
import { getRestaurant, type StorefrontMenu } from "@/lib/storefront/getRestaurant";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import type { MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";
import type { Partner } from "@/lib/partner/types";
import { CustomLanding } from "@/components/storefront/CustomLanding";

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

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

/** Dietary tag chip config — mirrors MenuWithFilters' TAG_STYLES labels. */
const TAG_LABELS: Record<string, string> = {
  V: "Vegetarian",
  VG: "Vegan",
  GF: "Gluten-free",
  H: "Halal",
  S: "Spicy",
  DF: "Dairy-free",
};

/* ── Component ──────────────────────────────────────────────────────────── */

/**
 * The restaurant storefront body for a resolved partner.
 * Reused by host-based (/storefront) and slug-based (/w/[slug]) routes.
 */
export async function RestaurantStorefront({ partner }: { partner: Partner }) {
  const restaurant = await getRestaurant(partner);

  if (partner.landingHtml && partner.landingHtml.trim()) {
    return <CustomLanding partner={partner} restaurant={restaurant} />;
  }

  if (!restaurant) notFound();

  const { listing, menu, areas, timeWindows, restaurantPhone } = restaurant;

  const heroPhoto = listing.photos?.[0] ?? null;
  const galleryPhotos = (listing.photos ?? []).slice(1);

  // Hero subline: cuisine · city · opening hours.
  const heroMetaParts: string[] = [];
  if (listing.cuisine?.length) heroMetaParts.push(listing.cuisine.join(" · "));
  if (listing.city) heroMetaParts.push(listing.city);
  if (listing.openingHours) heroMetaParts.push(listing.openingHours);

  // description is Sanity Portable Text (block content) — render with the
  // app's canonical renderer. getRestaurant types it as unknown[] | null.
  const description = (listing.description ?? null) as PortableTextBlock[] | null;
  const hasDescription = Array.isArray(description) && description.length > 0;

  // Prepare sections: filter hidden/empty, sort, null-safe dietary_tags.
  const sections = prepareSections(menu?.menu_sections ?? []);
  const hasMenu = !!menu && sections.length > 0;

  const reservationsOn = !!menu?.reservations_enabled;

  // Shared reservation trigger, sized per placement.
  const bookButton = (large: boolean) =>
    menu && reservationsOn ? (
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
        triggerClassName={
          large
            ? "h-[52px] px-8 text-[15px] shadow-[0_12px_40px_-12px_var(--color-amber)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-100 hover:scale-[1.02] active:scale-[0.98]"
            : "h-[48px] px-7 text-[14px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-100 hover:scale-[1.02] active:scale-[0.98]"
        }
      />
    ) : null;

  // Visit details (rendered in the closing section).
  const locationLine = [listing.city, listing.county].filter(Boolean).join(", ");

  return (
    <div className="text-text">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate min-h-[78vh] sm:min-h-[88vh] flex items-end overflow-hidden">
        {heroPhoto?.url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPhoto.url}
              alt={heroPhoto.alt ?? listing.title}
              className="absolute inset-0 -z-10 h-full w-full object-cover"
            />
            {/* Legibility gradient — anchored to the bottom, tasteful and soft. */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-dark/85 via-dark/35 to-dark/10" />
            <div className="absolute inset-0 -z-10 bg-dark/10" />
          </>
        ) : (
          <div className="absolute inset-0 -z-10 bg-dark" />
        )}

        <div className="mx-auto w-full max-w-5xl px-6 pb-16 pt-32 sm:px-8 sm:pb-24">
          <div className="max-w-3xl">
            {listing.cuisine?.length ? (
              <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur">
                {listing.cuisine[0]}
                {listing.priceRange ? (
                  <span className="ml-2 border-l border-white/25 pl-2 text-white/70">
                    {listing.priceRange}
                  </span>
                ) : null}
              </span>
            ) : null}

            <h1 className="mt-6 font-display text-[clamp(2.75rem,9vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.03em] text-white">
              {listing.title}
            </h1>

            {heroMetaParts.length > 0 && (
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-[17px]">
                {heroMetaParts.join("  ·  ")}
              </p>
            )}

            {menu && reservationsOn && (
              <div className="mt-9 flex flex-wrap items-center gap-4">
                {bookButton(true)}
                {hasMenu && (
                  <a
                    href="#menu"
                    className="group inline-flex items-center gap-2 text-[14px] font-semibold text-white/90 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-white"
                  >
                    View the menu
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-y-0.5">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M6 1.5v9M2 6.5 6 10.5l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── About ────────────────────────────────────────────────────────── */}
      {hasDescription && (
        <section className="mx-auto max-w-3xl px-6 py-24 sm:px-8 sm:py-32">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber">
            About
          </span>
          <div className="mt-7 text-[18px] leading-[1.85] text-text2 [&_p]:mb-6 [&_p:last-child]:mb-0">
            <PortableTextRenderer value={description!} className="max-w-none" />
          </div>
          {listing.atmosphere && (
            <p className="mt-8 border-l-2 border-amber/40 pl-5 font-display text-[19px] italic leading-snug text-dark">
              {listing.atmosphere}
            </p>
          )}
        </section>
      )}

      {/* ── Menu ─────────────────────────────────────────────────────────── */}
      {hasMenu ? (
        <section id="menu" className="scroll-mt-20 bg-surface">
          <div className="mx-auto max-w-4xl px-6 py-24 sm:px-8 sm:py-32">
            <div className="mb-16 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber">
                The Menu
              </span>
              <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.03em] text-dark">
                What we serve
              </h2>
            </div>

            <div className="space-y-20">
              {sections.map((section) => (
                <div key={section.id}>
                  <div className="mb-9 flex items-center gap-5">
                    <h3 className="font-display text-[24px] font-bold tracking-[-0.02em] text-dark sm:text-[28px]">
                      {section.title}
                    </h3>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <ul className="space-y-7">
                    {section.menu_items.map((item) => (
                      <li
                        key={item.id}
                        className={item.is_available ? "" : "opacity-45"}
                      >
                        <div className="flex items-baseline gap-3">
                          <h4 className="font-display text-[17px] font-semibold leading-snug text-dark">
                            {item.name}
                          </h4>
                          {/* Leader line bridging name → price. */}
                          <span className="mt-2 hidden h-px flex-1 self-end bg-border sm:block" />
                          <span className="ml-auto shrink-0 font-display text-[16px] font-bold text-amber sm:ml-0">
                            {item.is_available ? formatPrice(item.price_kes) : "—"}
                          </span>
                        </div>

                        {item.description && (
                          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-text2">
                            {item.description}
                          </p>
                        )}

                        {item.dietary_tags.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {item.dietary_tags.map((tag) => {
                              const label = TAG_LABELS[tag];
                              if (!label) return null;
                              return (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full bg-surface2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text3"
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* Empty state — menu not yet published. */
        <section className="mx-auto max-w-3xl px-6 py-24 text-center sm:px-8">
          <p className="font-display text-[22px] font-bold text-dark">Menu coming soon</p>
          <p className="mt-2 text-[15px] text-text2">
            {listing.title} hasn&apos;t published their menu yet.
          </p>
        </section>
      )}

      {/* ── Gallery ──────────────────────────────────────────────────────── */}
      {galleryPhotos.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-24 sm:px-8 sm:py-32">
          <div className="mb-12 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber">
              Gallery
            </span>
            <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.03em] text-dark">
              A look inside
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galleryPhotos.map((photo, i) => (
              <div
                key={`${photo.url}-${i}`}
                className={`group relative overflow-hidden rounded-[1.5rem] bg-surface shadow-[0_24px_60px_-30px_var(--color-dark)] ${
                  // First tile spans two columns on larger screens for rhythm.
                  i === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.alt ?? `${listing.title} — photo ${i + 2}`}
                  className={`h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04] ${
                    i === 0 ? "aspect-square sm:aspect-auto" : "aspect-[4/3]"
                  }`}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Visit / Location ─────────────────────────────────────────────── */}
      <section className="bg-dark">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:px-8 sm:py-32">
          <div className="grid gap-12 sm:grid-cols-2 sm:items-center">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber2">
                Visit us
              </span>
              <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.03em] text-white">
                {listing.title}
              </h2>
              {menu && reservationsOn && (
                <div className="mt-9">{bookButton(false)}</div>
              )}
            </div>

            <div className="space-y-7">
              {listing.address && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Address
                  </p>
                  <p className="mt-1.5 text-[16px] leading-relaxed text-white/90">
                    {listing.address}
                  </p>
                  {locationLine && (
                    <p className="text-[15px] text-white/60">{locationLine}</p>
                  )}
                </div>
              )}

              {!listing.address && locationLine && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Location
                  </p>
                  <p className="mt-1.5 text-[16px] text-white/90">{locationLine}</p>
                </div>
              )}

              {listing.openingHours && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Hours
                  </p>
                  <p className="mt-1.5 text-[16px] leading-relaxed text-white/90">
                    {listing.openingHours}
                  </p>
                </div>
              )}

              {restaurantPhone && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Reservations
                  </p>
                  <a
                    href={`tel:${restaurantPhone}`}
                    className="mt-1.5 inline-block text-[16px] text-white/90 transition-colors duration-300 hover:text-amber2"
                  >
                    {restaurantPhone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
