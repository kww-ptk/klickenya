import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import {
  LISTING_FEATURES,
  getActiveTabs,
  countActive,
  countAvailable,
  type FeatureContext,
} from "./_lib/features.config";
import { DEPLOYED_SEGMENTS } from "./layout";

/* ── Nairobi week helper ────────────────────────────────────────────────────
 * Returns ISO string for Monday 00:00 Africa/Nairobi of the current week.
 * All timezone math via Intl — no manual UTC offsets.
 */
function getStartOfCurrentWeekNairobi(): string {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(new Date()); // "YYYY-MM-DD"

  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
  }).format(new Date(`${todayStr}T09:00:00Z`));

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayIdx = weekdays.indexOf(weekdayName); // 0=Sun
  const daysSinceMonday = (dayIdx + 6) % 7;

  const monday = new Date(`${todayStr}T00:00:00+03:00`);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday.toISOString();
}

export default async function ListingOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const isAdmin = await getIsAdmin(user.id);

  const hostProfile = await getHostProfile(user.id);
  // Admin users may not have a host_profile — only redirect non-admins
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Fetch listing (ownership already validated in layout, but we need slug + type).
  // Mirror the layout's pattern: admin bypasses ownership filter.
  const listing = await sanityClient.fetch<{
    slug: string;
    type: string;
  } | null>(
    isAdmin
      ? `*[_id == $id && (_type == "listing" || _type == "event")][0]{
          "slug": slug.current, type
        }`
      : `*[_id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{
          "slug": slug.current, type
        }`,
    { id, userId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" },
  );

  if (!listing) redirect("/dashboard/listings");

  // Fetch linked menu — admin bypasses business_id ownership filter
  // (layout already validated listing ownership upstream).
  const { data: menu } = await (async () => {
    if (!listing.slug) return { data: null };
    let menuQuery = adminClient
      .from("menus")
      .select(
        "id, slug, table_ordering, reservations_enabled, ordering_enabled, takeaway_enabled, delivery_enabled, stock_enabled",
      )
      .eq("listing_slug", listing.slug);
    if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);
    return await menuQuery.maybeSingle();
  })();

  const featureCtx: FeatureContext = {
    listingType: "restaurant",
    menu: menu
      ? {
          id: menu.id,
          table_ordering: menu.table_ordering ?? false,
          reservations_enabled: menu.reservations_enabled ?? false,
          ordering_enabled: menu.ordering_enabled ?? false,
          takeaway_enabled: menu.takeaway_enabled ?? false,
          delivery_enabled: menu.delivery_enabled ?? false,
          stock_enabled: menu.stock_enabled ?? false,
        }
      : undefined,
  };

  const activeCount = countActive(featureCtx);
  const totalCount = countAvailable(featureCtx);
  const reservationsActive = featureCtx.menu?.reservations_enabled ?? false;

  const startOfWeek = getStartOfCurrentWeekNairobi();

  // Parallel stats queries
  const [viewsResult, bookingsResult, pendingResult] = await Promise.allSettled([
    // Listing page views this week (listing_events table)
    listing.slug
      ? adminClient
          .from("listing_events")
          .select("id", { count: "exact", head: true })
          .eq("listing_slug", listing.slug)
          .eq("event_type", "page_view")
          .gte("created_at", startOfWeek)
      : Promise.resolve({ count: null, data: null, error: null }),

    // Reservations this week (any non-cancelled status)
    menu
      ? adminClient
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("menu_id", menu.id)
          .gte("created_at", startOfWeek)
          .in("status", ["pending", "approved", "checked_in", "completed"])
      : Promise.resolve({ count: null, data: null, error: null }),

    // Pending reservations (action required)
    menu
      ? adminClient
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("menu_id", menu.id)
          .eq("status", "pending")
      : Promise.resolve({ count: null, data: null, error: null }),
  ]);

  const viewsThisWeek =
    viewsResult.status === "fulfilled" ? (viewsResult.value.count ?? 0) : 0;
  const bookingsThisWeek =
    bookingsResult.status === "fulfilled"
      ? (bookingsResult.value.count ?? 0)
      : 0;
  const pendingCount =
    pendingResult.status === "fulfilled"
      ? (pendingResult.value.count ?? 0)
      : 0;

  // Quick-link cards: one per active feature tab + permanent Features card
  const activeTabs = getActiveTabs(featureCtx);
  const showWelcomeCallout = activeCount <= 1; // only menu active (or nothing)

  // Back-nav target so the operational pages (menu builder, QR, kitchen view,
  // audit log, stock) can render "← Back to dashboard" instead of "Back to
  // menu builder" when the user got there via this dashboard.
  const back = `back=${encodeURIComponent(`/dashboard/listings/${id}`)}`;

  return (
    <div className="space-y-5">
      {/* ── Welcome callout (shown when ≤1 add-on active) ── */}
      {showWelcomeCallout && (
        <div className="rounded-xl lg:rounded-2xl border border-amber/30 bg-amber/[0.06] p-4 lg:p-5">
          <p className="text-[13px] font-semibold text-dark mb-0.5">
            Your listing is live!
          </p>
          <p className="text-[13px] text-text2">
            You haven&apos;t enabled any add-ons yet.{" "}
            <Link
              href={`/dashboard/listings/${id}/features`}
              className="text-amber font-semibold hover:underline"
            >
              Visit the Features tab
            </Link>{" "}
            to turn on reservations, table ordering, and more.
          </p>
        </div>
      )}

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        {/* Listing views this week */}
        <div
          className="bg-white rounded-xl lg:rounded-2xl border border-border p-4 shadow-sm"
          title="Views tracked from your live listing page"
        >
          <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-1">
            Views this week
          </p>
          <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-dark leading-none">
            {viewsThisWeek}
          </p>
          {/* TODO V2: link to per-listing analytics breakdown in /dashboard/stats */}
        </div>

        {/* Bookings this week */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-border p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-1">
            Bookings this week
          </p>
          {reservationsActive ? (
            <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-dark leading-none">
              {bookingsThisWeek}
            </p>
          ) : (
            <>
              <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-text3 leading-none">
                —
              </p>
              <p className="text-[11px] text-text3 mt-1 leading-snug">
                Enable reservations to track
              </p>
            </>
          )}
        </div>

        {/* Active add-ons */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-border p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-1">
            Active add-ons
          </p>
          <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-dark leading-none">
            {activeCount}
            <span className="text-[16px] text-text3 font-semibold">
              /{totalCount}
            </span>
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-amber rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (activeCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Pending actions */}
        {reservationsActive ? (
          <Link
            href={`/dashboard/listings/${id}/reservations`}
            className={`rounded-xl lg:rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
              pendingCount > 0
                ? "bg-amber/[0.06] border-amber/30"
                : "bg-white border-border"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide">
                Pending actions
              </p>
              {pendingCount > 0 && (
                <span className="size-1.5 rounded-full bg-amber animate-pulse" />
              )}
            </div>
            <p className={`font-display text-[26px] font-bold tracking-[-0.02em] leading-none ${
              pendingCount > 0 ? "text-amber" : "text-dark"
            }`}>
              {pendingCount}
            </p>
          </Link>
        ) : (
          <div className="bg-white rounded-xl lg:rounded-2xl border border-border p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-1">
              Pending actions
            </p>
            <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-dark leading-none">
              0
            </p>
          </div>
        )}
      </div>

      {/* ── Quick Access ─────────────────────────────────────────────────────
           Active features each get a card. Cards for deployed tab segments
           are clickable links. Cards for not-yet-deployed segments render
           with an amber "Coming soon" badge and are non-clickable.
           DEPLOYED_SEGMENTS is the single source of truth — imported from layout.tsx.
           When Prompt 8c adds 'reservations' to DEPLOYED_SEGMENTS the badge
           disappears and the card becomes a link automatically.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-text3 uppercase tracking-wide">
          Quick access
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeTabs.map((feature) => {
            // ── Digital menu: special case ──────────────────────────────────
            // tabSegment is 'menu' but the destination lives at the legacy
            // /dashboard/menu/[id] route until Prompt 9 migrates it here.
            // TODO Prompt 9: Menu editing will move under /dashboard/listings/[id]/menu/
            // in Prompt 9. Until then, link to the legacy /dashboard/menu/[id] route directly.
            if (feature.id === "menu" && featureCtx.menu) {
              return (
                <Link
                  key={feature.id}
                  href={`/dashboard/menu/${featureCtx.menu.id}?${back}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
                >
                  <span className="text-[22px] shrink-0">{featureIcon(feature.icon)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-dark">{feature.label}</p>
                    <p className="text-[11px] text-text3 truncate">{feature.shortDescription}</p>
                  </div>
                  <span className="text-text3 text-[16px] shrink-0">›</span>
                </Link>
              );
            }

            // ── Klickenya Kitchen: same special-case as Digital menu ────────
            // Real pages live under /dashboard/menu/[menu.id]/stock. The
            // /dashboard/listings/[id]/kitchen page is just a redirect, but
            // we link directly to skip the round-trip.
            if (feature.id === "klickenya_kitchen" && featureCtx.menu) {
              return (
                <Link
                  key={feature.id}
                  href={`/dashboard/menu/${featureCtx.menu.id}/stock?${back}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
                >
                  <span className="text-[22px] shrink-0">{featureIcon(feature.icon)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-dark">{feature.label}</p>
                    <p className="text-[11px] text-text3 truncate">{feature.shortDescription}</p>
                  </div>
                  <span className="text-text3 text-[16px] shrink-0">›</span>
                </Link>
              );
            }

            // ── Table ordering: short-circuit to the dedicated SETUP page,
            // not the live kitchen view. The setup page hosts the toggle +
            // table CRUD + operational deep-links. The Tools 'Kitchen view'
            // card is the one that opens the live order screen.
            if (feature.id === "table_ordering" && featureCtx.menu) {
              return (
                <Link
                  key={feature.id}
                  href={`/dashboard/listings/${id}/orders`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
                >
                  <span className="text-[22px] shrink-0">{featureIcon(feature.icon)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-dark">{feature.label}</p>
                    <p className="text-[11px] text-text3 truncate">{feature.shortDescription}</p>
                  </div>
                  <span className="text-text3 text-[16px] shrink-0">›</span>
                </Link>
              );
            }

            // ── Deployed segment → normal clickable card ────────────────────
            const isDeployed = feature.tabSegment
              ? DEPLOYED_SEGMENTS.has(feature.tabSegment)
              : false;

            if (isDeployed) {
              return (
                <Link
                  key={feature.id}
                  href={`/dashboard/listings/${id}/${feature.tabSegment}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
                >
                  <span className="text-[22px] shrink-0">{featureIcon(feature.icon)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-dark">{feature.label}</p>
                    <p className="text-[11px] text-text3 truncate">{feature.shortDescription}</p>
                  </div>
                  <span className="text-text3 text-[16px] shrink-0">›</span>
                </Link>
              );
            }

            // ── Not-yet-deployed → muted card with "Coming soon" badge ──────
            return (
              <div
                key={feature.id}
                className="relative flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm opacity-70 cursor-default select-none"
              >
                {/* Coming soon badge */}
                <span className="absolute top-2.5 right-2.5 text-[9px] font-bold text-amber bg-amber/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Coming soon
                </span>
                <span className="text-[22px] shrink-0">{featureIcon(feature.icon)}</span>
                <div className="flex-1 min-w-0 pr-16">
                  <p className="text-[13px] font-semibold text-dark">{feature.label}</p>
                  <p className="text-[11px] text-text3 truncate">{feature.shortDescription}</p>
                </div>
                {/* No chevron — card is not clickable */}
              </div>
            );
          })}

        </div>
      </div>

      {/* ── Tools ────────────────────────────────────────────────────────────
           Operational links that aren't features in their own right -- they're
           sub-views of an active feature (Kitchen view + Audit log are inside
           Table ordering, QR + View live menu are inside Digital menu). Kept
           here, surfaced from the dashboard, so owners don't have to dig into
           the menu builder's right sidebar. Render conditionally so the
           section is empty/quiet when nothing is relevant.
      ─────────────────────────────────────────────────────────────────────── */}
      {featureCtx.menu && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-text3 uppercase tracking-wide">
            Tools
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {featureCtx.menu.table_ordering && (
              <Link
                href={`/dashboard/menu/${featureCtx.menu.id}/orders?${back}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
              >
                <span className="text-[22px] shrink-0">🍳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-dark">Kitchen view</p>
                  <p className="text-[11px] text-text3 truncate">Live order screen for the kitchen team</p>
                </div>
                <span className="text-text3 text-[16px] shrink-0">›</span>
              </Link>
            )}
            {/* POS — landing on a management page (URL, staff PINs)
                that links out to /pos/[slug] for the actual terminal. */}
            {menu?.slug && (
              <Link
                href={`/dashboard/listings/${id}/pos`}
                className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
              >
                <span className="text-[22px] shrink-0">📱</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-dark">POS &amp; staff</p>
                  <p className="text-[11px] text-text3 truncate">Sign-in URL and 4-digit PIN management</p>
                </div>
                <span className="text-text3 text-[16px] shrink-0">›</span>
              </Link>
            )}
            {featureCtx.menu.table_ordering && (
              <Link
                href={`/dashboard/menu/${featureCtx.menu.id}/audit?${back}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
              >
                <span className="text-[22px] shrink-0">📋</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-dark">Audit log</p>
                  <p className="text-[11px] text-text3 truncate">Order edits, voids and manager overrides</p>
                </div>
                <span className="text-text3 text-[16px] shrink-0">›</span>
              </Link>
            )}
            <Link
              href={`/dashboard/menu/${featureCtx.menu.id}/qr?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
            >
              <span className="text-[22px] shrink-0">🔳</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-dark">QR code</p>
                <p className="text-[11px] text-text3 truncate">Download printable QR codes for tables</p>
              </div>
              <span className="text-text3 text-[16px] shrink-0">›</span>
            </Link>
            {listing.slug && (
              <a
                href={`/m/${listing.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
              >
                <span className="text-[22px] shrink-0">🔗</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-dark">View live menu</p>
                  <p className="text-[11px] text-text3 truncate">Opens what guests see, in a new tab</p>
                </div>
                <span className="text-text3 text-[16px] shrink-0">↗</span>
              </a>
            )}
            <Link
              href={`/dashboard/listings/${id}/features`}
              className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
            >
              <span className="text-[22px] shrink-0">⚙️</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-dark">Configure features</p>
                <p className="text-[11px] text-text3 truncate">Turn on reservations, ordering, and more</p>
              </div>
              <span className="text-text3 text-[16px] shrink-0">›</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Icon emoji fallback map ──────────────────────────────────────────────── */
// Used for quick links — Lucide is imported at the Features page render site.
// Adding here avoids a client bundle in this server component.
function featureIcon(iconName: string): string {
  const map: Record<string, string> = {
    UtensilsCrossed: "🍽️",
    ShoppingCart: "🛒",
    CalendarCheck: "📅",
    ShoppingBag: "🥡",
    Bike: "🛵",
    ChefHat: "🍳",
  };
  return map[iconName] ?? "⚡";
}
