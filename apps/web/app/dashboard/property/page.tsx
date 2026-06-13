import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAuthUser, getIsAdmin } from "../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { UnifiedCalendarWrapper } from "./calendar/_components/UnifiedCalendarWrapper";

const TYPE_LABELS: Record<string, string> = {
  villa: "Villa / Holiday Home",
  hotel: "Hotel",
  guesthouse: "Guesthouse",
  apartment: "Apartment",
  cottage: "Beach Cottage",
  camp: "Safari Camp",
};

export default async function PropertyPMSPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const isAdmin = await getIsAdmin(user.id);

  // Admin bypasses owner_id filter — sees all platform properties
  let propertiesQuery = adminClient
    .from("properties")
    .select("id, name, property_type, city, is_active")
    .order("created_at", { ascending: true });
  if (!isAdmin) propertiesQuery = propertiesQuery.eq("owner_id", user.id);
  const { data: properties } = await propertiesQuery;

  /* ── No properties yet ── */
  if (!properties || properties.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
              Property PMS
            </h1>
            <p className="text-[13px] text-text3 mt-0.5">Manage your properties</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-[28px]">🏠</span>
          </div>
          <p className="font-display text-[16px] font-bold text-dark mb-1">No properties yet</p>
          <p className="text-[13px] text-text3 mb-4 max-w-[280px] mx-auto">
            Set up your first property to start managing bookings and availability.
          </p>
          <Link
            href="/dashboard/property/new"
            className="inline-block bg-[#4F46E5] text-white font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#4338CA] transition-colors shadow-sm"
          >
            Add property
          </Link>
        </div>
      </div>
    );
  }

  const propertyIds = properties.map((p) => p.id);
  const todayStr = new Date().toISOString().split("T")[0];
  const sixtyDaysOut = new Date();
  sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);
  const sixtyStr = sixtyDaysOut.toISOString().split("T")[0];
  const now = new Date();
  const monthStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthEndStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [roomsResult, bookingsResult, statsBookingsResult, enquiriesResult] = await Promise.all([
    adminClient
      .from("rooms")
      .select("id, name, room_number, room_type, max_guests, base_price_kes, is_active, property_id, display_order, photos")
      .in("property_id", propertyIds)
      .eq("is_active", true)
      .order("display_order"),
    adminClient
      .from("bookings")
      .select("id, property_id, room_id, guest_name, guest_email, guest_phone, guest_count, guest_notes, check_in_date, check_out_date, nights, source, external_id, rate_per_night, subtotal_kes, discount_kes, extras_kes, total_kes, amount_paid_kes, balance_kes, status, payment_status, mpesa_ref, internal_notes, created_at")
      .in("property_id", propertyIds)
      .neq("status", "cancelled")
      .lt("check_in_date", sixtyStr)
      .gt("check_out_date", todayStr),
    adminClient
      .from("bookings")
      .select("total_kes, check_in_date, check_out_date, status")
      .in("property_id", propertyIds)
      .neq("status", "cancelled")
      .gte("check_in_date", monthStartStr)
      .lte("check_in_date", monthEndStr),
    adminClient
      .from("contact_requests")
      .select("id, full_name, email, phone, room_id, check_in, check_out, guests, calendar_status, hold_type, expires_at, listing_title, notes, property_id")
      .in("property_id", propertyIds)
      .in("calendar_status", ["pending", "held"])
      .not("room_id", "is", null)
      .not("check_in", "is", null)
      .not("check_out", "is", null),
  ]);

  const rooms = roomsResult.data ?? [];
  const bookings = bookingsResult.data ?? [];
  const statsBookings = statsBookingsResult.data ?? [];
  const enquiries = enquiriesResult.data ?? [];

  const roomIds = rooms.map((r) => r.id);
  const blockedResult =
    roomIds.length > 0
      ? await adminClient
          .from("blocked_dates")
          .select("id, room_id, start_date, end_date, reason")
          .in("room_id", roomIds)
          .lt("start_date", sixtyStr)
          .gt("end_date", todayStr)
      : { data: [] };
  const blockedDates = blockedResult.data ?? [];

  /* ── Stats for stats bar ── */
  const occupiedTonight = bookings.filter(
    (b) => b.check_in_date <= todayStr && b.check_out_date > todayStr
  ).length;
  const checkInsToday = bookings.filter((b) => b.check_in_date === todayStr).length;
  const checkOutsToday = bookings.filter((b) => b.check_out_date === todayStr).length;
  const availableTonight = Math.max(0, rooms.length - occupiedTonight);
  const revenueThisMonth = statsBookings.reduce((sum, b) => sum + (b.total_kes ?? 0), 0);

  const isSingle = properties.length === 1;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
            Property PMS
          </h1>
          <p className="text-[13px] text-text3 mt-0.5">
            {properties.length} {properties.length === 1 ? "property" : "properties"} · {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
          </p>
        </div>
        <Link
          href="/dashboard/property/new"
          className="text-[13px] font-semibold text-white bg-[#4F46E5] px-4 h-[40px] flex items-center rounded-xl hover:bg-[#4338CA] transition-colors"
        >
          + Add property
        </Link>
      </div>

      {/* Unified calendar */}
      <div className="mb-10">
        <UnifiedCalendarWrapper
          properties={properties}
          rooms={rooms}
          bookings={bookings}
          blockedDates={blockedDates}
          enquiries={enquiries}
          singleProperty={isSingle}
          stats={{ occupiedTonight, checkInsToday, checkOutsToday, availableTonight, revenueThisMonth }}
        />
      </div>

      {/* My Properties */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[17px] lg:text-[20px] font-bold text-dark tracking-[-0.02em]">
            My Properties
          </h2>
          <Link
            href="/dashboard/property/new"
            className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
          >
            + Add →
          </Link>
        </div>

        <div className="space-y-3">
          {properties.map((prop) => {
            const propRooms = rooms.filter((r) => r.property_id === prop.id);
            const roomCount = propRooms.length;
            const occupiedCount = bookings.filter(
              (b) => b.property_id === prop.id && b.check_in_date <= todayStr && b.check_out_date > todayStr
            ).length;
            const occupancyPct = roomCount > 0 ? Math.round((occupiedCount / roomCount) * 100) : 0;
            const pendingCount = enquiries.filter((e) => e.property_id === prop.id).length;
            const coverRoom = propRooms.find((r) => Array.isArray(r.photos) && (r.photos as string[]).length > 0);
            const coverPhoto = coverRoom ? (coverRoom.photos as string[])[0] : null;

            return (
              <div
                key={prop.id}
                className="flex items-center gap-3 bg-white rounded-xl lg:rounded-2xl border border-border p-3 shadow-sm hover:shadow-md hover:border-[#4F46E5]/30 transition-all"
              >
                {/* Cover photo — links to property */}
                <Link href={`/dashboard/property/${prop.id}`} className="shrink-0 w-[52px] h-[52px] rounded-lg overflow-hidden bg-surface relative">
                  {coverPhoto ? (
                    <Image
                      src={`${coverPhoto}?w=104&auto=format`}
                      alt={prop.name}
                      fill
                      sizes="52px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[20px]">
                      {prop.property_type === "camp" ? "⛺" : prop.property_type === "apartment" ? "🏢" : "🏡"}
                    </div>
                  )}
                </Link>

                {/* Info — links to property */}
                <Link href={`/dashboard/property/${prop.id}`} className="flex-1 min-w-0 block">
                  <p className="text-[14px] font-semibold text-dark truncate">{prop.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-medium text-text2 bg-surface px-1.5 py-0.5 rounded-full">
                      {TYPE_LABELS[prop.property_type] ?? prop.property_type}
                    </span>
                    {prop.city && (
                      <span className="text-[11px] text-text3">{prop.city}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-text3">
                      {roomCount} {roomCount === 1 ? "room" : "rooms"} · {occupancyPct}% occupied
                    </span>
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-semibold text-amber bg-amber/10 px-1.5 py-0.5 rounded-full">
                        {pendingCount} pending
                      </span>
                    )}
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/dashboard/property/${prop.id}/settings`}
                    className="text-[11px] font-semibold text-text2 bg-surface px-2.5 h-[28px] rounded-lg hover:bg-[#E8E4DC] transition-colors flex items-center"
                  >
                    Settings
                  </Link>
                  <Link
                    href={`/dashboard/property/${prop.id}`}
                    className="text-[13px] font-semibold text-[#4F46E5]"
                  >
                    →
                  </Link>
                </div>
              </div>
            );
          })}

          {/* + Add property card */}
          <Link
            href="/dashboard/property/new"
            className="flex items-center justify-center gap-2 bg-white rounded-xl lg:rounded-2xl border-2 border-dashed border-border p-5 text-text3 hover:border-[#4F46E5]/40 hover:text-[#4F46E5] transition-colors"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-[13px] font-semibold">Add property</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
