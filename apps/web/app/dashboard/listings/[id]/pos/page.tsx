import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, getHostProfile } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { PosPageClient } from "./PosPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * POS surface for a restaurant listing. Shows the staff PIN sign-in URL,
 * a one-tap "Open POS terminal" CTA, and the staff CRUD that used to live
 * inside Reservations Settings.
 *
 * Conceptually: this page is about taking orders, not booking tables.
 * Reservations is unrelated.
 */
export default async function PosPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile) redirect("/dashboard");

  const listing = await sanityClient.fetch<{ slug: string; title: string } | null>(
    `*[_id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{
      "slug": slug.current, title
    }`,
    { id, userId: user.id, sanityHostId: hostProfile.sanity_host_id ?? "" },
  );
  if (!listing?.slug) redirect("/dashboard/listings");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, slug, table_ordering")
    .eq("listing_slug", listing.slug)
    .eq("business_id", user.id)
    .maybeSingle();

  if (!menu) {
    return (
      <div>
        <Link
          href={`/dashboard/listings/${id}`}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          POS terminal
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1 mb-5">
          Set up your menu first — the POS reads from your menu items.
        </p>
        <Link
          href={`/dashboard/listings/${id}`}
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[44px] leading-[44px] rounded-full hover:bg-[#d4911c]"
        >
          Set up menu →
        </Link>
      </div>
    );
  }

  return <PosPageClient listingId={id} menuId={menu.id} menuName={menu.name} menuSlug={menu.slug} />;
}
