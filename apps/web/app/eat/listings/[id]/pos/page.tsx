import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../../../dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { PosPageClient } from "../../../../dashboard/listings/[id]/pos/PosPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /eat/listings/[id]/pos — POS terminal management in the /eat shell.
 * Forks from the legacy page so it can pass mode="pos-only" + featureBaseHref.
 */
export default async function EatPosPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect(`/login?returnTo=/eat/listings/${id}/pos`);

  const isAdmin = await getIsAdmin(user.id);
  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  const listing = await sanityClient.fetch<{ slug: string; title: string } | null>(
    isAdmin
      ? `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants")][0]{
          "slug": slug.current, title
        }`
      : `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants") && (hostId == $userId || host._ref == $sanityHostId)][0]{
          "slug": slug.current, title
        }`,
    { id, userId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" },
  );
  if (!listing?.slug) redirect("/eat/listings");

  let menuQuery = adminClient
    .from("menus")
    .select("id, name, slug, table_ordering")
    .eq("listing_slug", listing.slug);
  if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);
  const { data: menu } = await menuQuery.maybeSingle();

  if (!menu) {
    return (
      <div>
        <Link
          href={`/eat/listings/${id}`}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
        >
          ← Back to overview
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          POS terminal
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1 mb-5">
          Set up your menu first — the POS reads from your menu items.
        </p>
        <Link
          href={`/eat/listings/${id}/menu`}
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[44px] leading-[44px] rounded-full hover:bg-[#d4911c]"
        >
          Set up menu →
        </Link>
      </div>
    );
  }

  return (
    <PosPageClient
      listingId={id}
      menuId={menu.id}
      menuName={menu.name}
      menuSlug={menu.slug}
      mode="pos-only"
      featureBaseHref={`/eat/listings/${id}`}
    />
  );
}
