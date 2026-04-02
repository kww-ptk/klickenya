import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";

export default async function PropertyListPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  // Fetch all properties for this owner
  const { data: properties } = await adminClient
    .from("properties")
    .select("id, name, property_type, city, is_active, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // For each property, get room count + upcoming check-ins + occupancy
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const todayStr = now.toISOString().split("T")[0];
  const monthEndStr = monthEnd.toISOString().split("T")[0];

  const enriched = await Promise.all(
    (properties ?? []).map(async (prop) => {
      const [roomResult, checkInResult, occupancyResult] = await Promise.allSettled([
        adminClient
          .from("rooms")
          .select("id", { count: "exact", head: true })
          .eq("property_id", prop.id),
        adminClient
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("property_id", prop.id)
          .gte("check_in_date", todayStr)
          .lte("check_in_date", monthEndStr)
          .neq("status", "cancelled"),
        adminClient
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("property_id", prop.id)
          .lte("check_in_date", todayStr)
          .gt("check_out_date", todayStr)
          .neq("status", "cancelled"),
      ]);

      const roomCount = roomResult.status === "fulfilled" ? roomResult.value.count ?? 0 : 0;
      const upcomingCheckIns = checkInResult.status === "fulfilled" ? checkInResult.value.count ?? 0 : 0;
      const occupiedTonight = occupancyResult.status === "fulfilled" ? occupancyResult.value.count ?? 0 : 0;
      const occupancyPct = roomCount > 0 ? Math.round((occupiedTonight / roomCount) * 100) : 0;

      return { ...prop, roomCount, upcomingCheckIns, occupancyPct };
    })
  );

  const typeLabels: Record<string, string> = {
    villa: "Villa / Holiday Home",
    hotel: "Hotel",
    guesthouse: "Guesthouse",
    apartment: "Apartment",
    cottage: "Beach Cottage",
    camp: "Safari Camp",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            My Properties
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            Manage your accommodation listings
          </p>
        </div>
        <Link
          href="/dashboard/property/new"
          className="text-[13px] font-semibold text-white bg-[#4F46E5] px-4 h-[40px] flex items-center rounded-xl hover:bg-[#4338CA] transition-colors"
        >
          Add property
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-[28px]">🏠</span>
          </div>
          <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
            No properties yet
          </p>
          <p className="text-[13px] text-[#9C9485] mb-4 max-w-[280px] mx-auto">
            Set up your first property to start managing bookings and availability.
          </p>
          <Link
            href="/dashboard/property/new"
            className="inline-block bg-[#4F46E5] text-white font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#4338CA] transition-colors shadow-sm"
          >
            Add property
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {enriched.map((prop) => (
            <Link
              key={prop.id}
              href={`/dashboard/property/${prop.id}`}
              className="block bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 shadow-sm hover:shadow-md hover:border-[#4F46E5]/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="shrink-0 w-[56px] h-[56px] rounded-xl bg-[#4F46E5]/8 flex items-center justify-center">
                  <span className="text-[24px]">
                    {prop.property_type === "hotel" || prop.property_type === "guesthouse" ? "🏨" :
                     prop.property_type === "camp" ? "⛺" :
                     prop.property_type === "apartment" ? "🏢" : "🏡"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-[#16130C] truncate">
                    {prop.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-[#9C9485]">
                      {typeLabels[prop.property_type] ?? prop.property_type}
                    </span>
                    {prop.city && (
                      <>
                        <span className="text-[#E2DDD5]">·</span>
                        <span className="text-[11px] text-[#9C9485]">{prop.city}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-[#5E5848]">
                      {prop.roomCount} {prop.roomCount === 1 ? "room" : "rooms"}
                    </span>
                    {prop.roomCount > 0 && (
                      <>
                        <span className="text-[11px] text-[#5E5848]">
                          {prop.occupancyPct}% occupied
                        </span>
                        <span className="text-[11px] text-[#5E5848]">
                          {prop.upcomingCheckIns} upcoming
                        </span>
                      </>
                    )}
                    {prop.roomCount === 0 && (
                      <span className="text-[10px] font-bold text-[#E8A020] bg-[#E8A020]/8 px-2 py-0.5 rounded-full">
                        Needs setup
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="text-[12px] font-semibold text-[#4F46E5]">
                    Manage →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
