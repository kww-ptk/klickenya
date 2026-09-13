import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../../../dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { RidersClient } from "./RidersClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** /manage/listings/[id]/riders — who is allowed to deliver for this kitchen. */
export default async function ManageRidersPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect(`/login?returnTo=/manage/listings/${id}/riders`);

  const isAdmin = await getIsAdmin(user.id);
  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  const listing = await sanityClient.fetch<{ slug: string } | null>(
    isAdmin
      ? `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants")][0]{ "slug": slug.current }`
      : `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants") && (hostId == $userId || host._ref == $sanityHostId)][0]{ "slug": slug.current }`,
    { id, userId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" },
  );
  if (!listing?.slug) redirect("/manage/listings");

  let menuQuery = adminClient.from("menus").select("id, name").eq("listing_slug", listing.slug);
  if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);
  const { data: menu } = await menuQuery.maybeSingle();

  if (!menu) {
    return (
      <div>
        <Link href={`/manage/listings/${id}`} className="text-[13px] text-[#9C9485]">
          ← Back to overview
        </Link>
        <h1 className="font-display text-[22px] font-bold text-[#16130C] mt-2">Riders</h1>
        <p className="text-[13px] text-[#9C9485] mt-1">Set up your menu first.</p>
      </div>
    );
  }

  const { data: links } = await adminClient
    .from("rider_menus")
    .select("rider_id")
    .eq("menu_id", menu.id);

  const ids = (links ?? []).map((l) => l.rider_id as string);
  let riders: { id: string; name: string; phone: string; is_active: boolean }[] = [];
  if (ids.length > 0) {
    const { data } = await adminClient
      .from("riders")
      .select("id, name, phone, is_active")
      .in("id", ids)
      .order("name", { ascending: true });
    riders = data ?? [];
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/manage/listings/${id}`} className="text-[13px] text-[#9C9485] hover:text-[#16130C]">
          ← Back to overview
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Riders
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
          They sign in at <span className="font-bold">klickenya.com/rider</span> and take
          deliveries once the kitchen marks an order ready.
        </p>
      </div>

      <RidersClient menuId={menu.id} initialRiders={riders} />
    </div>
  );
}
