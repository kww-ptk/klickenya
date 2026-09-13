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

  // Klickenya's own riders also deliver for this kitchen. The owner does not
  // manage them and cannot change them, but seeing who can turn up matters.
  const { data: platformRows } = await adminClient
    .from("riders")
    .select("id, name, phone")
    .eq("is_platform", true)
    .eq("is_active", true)
    .order("name", { ascending: true });
  const platformRiders = platformRows ?? [];

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
          Your own riders. They sign in at{" "}
          <span className="font-bold">klickenya.com/rider</span> and can take a job as soon
          as you press Start preparing.
        </p>
      </div>

      <RidersClient menuId={menu.id} initialRiders={riders} />

      {platformRiders.length > 0 && (
        <section>
          <h2 className="font-display text-[16px] font-bold text-[#16130C] mb-1">
            Klickenya riders
          </h2>
          <p className="text-[13px] text-[#9C9485] mb-3 max-w-[560px]">
            Hired by Klickenya and available to every restaurant that delivers. They can
            take your orders too — you don&apos;t manage them here.
          </p>
          <ul className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm divide-y divide-[#F4F1EC]">
            {platformRiders.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-bold text-[14.5px] text-[#16130C]">{r.name}</p>
                  <p className="text-[13px] text-[#9C9485]">{r.phone}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#16130C] px-2.5 py-0.5 text-[11px] font-bold uppercase text-white">
                  Klickenya
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
