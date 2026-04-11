import { redirect } from "next/navigation";
import { Lock, UtensilsCrossed, ShoppingCart, CalendarCheck, ShoppingBag, Bike } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getAuthUser, getHostProfile } from "../../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import {
  LISTING_FEATURES,
  type FeatureContext,
  type FeatureStatus,
} from "../_lib/features.config";

/* ── Icon map (avoids dynamic import in RSC) ─────────────────────────────── */
const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingCart,
  CalendarCheck,
  ShoppingBag,
  Bike,
};

/* ── Status pill config ─────────────────────────────────────────────────── */
const STATUS_STYLES: Record<FeatureStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-[#16A34A]/10 text-[#16A34A]",
  },
  inactive: {
    label: "Inactive",
    className: "bg-[#F4F1EC] text-[#9C9485]",
  },
  coming_soon: {
    label: "Coming soon",
    className: "bg-[#E8A020]/10 text-[#E8A020]",
  },
  paid_coming_soon: {
    label: "Paid — coming soon",
    className: "bg-[#6B2D8B]/10 text-[#6B2D8B]",
  },
};

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile) redirect("/dashboard");

  // Fetch listing slug + type
  const listing = await sanityClient.fetch<{ slug: string; type: string } | null>(
    `*[_id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{
      "slug": slug.current, type
    }`,
    { id, userId: user.id, sanityHostId: hostProfile.sanity_host_id ?? "" },
  );

  if (!listing) redirect("/dashboard/listings");

  // Fetch linked menu for feature status
  const { data: menu } = listing.slug
    ? await adminClient
        .from("menus")
        .select(
          "id, table_ordering, reservations_enabled, ordering_enabled, takeaway_enabled, delivery_enabled",
        )
        .eq("listing_slug", listing.slug)
        .eq("business_id", user.id)
        .maybeSingle()
    : { data: null };

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
        }
      : undefined,
  };

  const features = LISTING_FEATURES.filter((f) =>
    f.appliesTo.includes(featureCtx.listingType),
  );

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h2 className="font-display text-[18px] lg:text-[20px] font-bold tracking-[-0.02em] text-[#16130C]">
          Features &amp; add-ons
        </h2>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Manage the tools available for your listing.
        </p>
      </div>

      {/* ── Coming-soon callout ── */}
      <div className="rounded-xl border border-[#E2DDD5] bg-[#F4F1EC]/60 p-4 lg:p-5">
        <p className="text-[13px] font-semibold text-[#16130C] mb-1">
          Add-on management coming soon
        </p>
        <p className="text-[13px] text-[#5E5848]">
          You&apos;ll configure all your listing features here — reservations, table
          ordering, delivery, and more. For now, use{" "}
          <span className="font-semibold text-[#16130C]">Menu → Publish Panel</span>{" "}
          to toggle individual features.
        </p>
      </div>

      {/* ── Feature preview grid (disabled / locked) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((feature) => {
          const status = feature.getStatus(featureCtx);
          const style = STATUS_STYLES[status];
          const Icon = ICON_MAP[feature.icon];

          return (
            <div
              key={feature.id}
              className="relative bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 shadow-sm opacity-90"
            >
              {/* Lock icon */}
              <div className="absolute top-3 right-3 text-[#E2DDD5]">
                <Lock className="size-3.5" />
              </div>

              {/* Icon + label */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-9 rounded-xl bg-[#F4F1EC] flex items-center justify-center">
                  {Icon ? (
                    <Icon className="size-4 text-[#5E5848]" />
                  ) : (
                    <span className="text-[16px]">⚡</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-5">
                  <p className="text-[13px] font-semibold text-[#16130C]">
                    {feature.label}
                  </p>
                  <p className="text-[12px] text-[#9C9485] mt-0.5 leading-snug">
                    {feature.shortDescription}
                  </p>
                </div>
              </div>

              {/* Status pill */}
              <div className="mt-3">
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${style.className}`}
                >
                  {style.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
