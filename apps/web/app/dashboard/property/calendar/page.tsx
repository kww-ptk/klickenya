import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { UnifiedCalendarWrapper } from "./_components/UnifiedCalendarWrapper";

export default async function UnifiedCalendarPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  // Fetch all properties for this owner (same filter as property list page)
  const { data: properties } = await adminClient
    .from("properties")
    .select("id, name, property_type, city, is_active")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (!properties || properties.length === 0) {
    redirect("/dashboard/property");
  }

  const propertyIds = properties.map((p) => p.id);

  const todayStr = new Date().toISOString().split("T")[0];
  const sixtyDaysOut = new Date();
  sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);
  const sixtyStr = sixtyDaysOut.toISOString().split("T")[0];

  const now = new Date();
  const monthStartStr = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEndStr = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Fetch rooms + active bookings + stats bookings + enquiries in parallel
  const [roomsResult, bookingsResult, statsBookingsResult, enquiriesResult] = await Promise.all([
    adminClient
      .from("rooms")
      .select(
        "id, name, room_number, room_type, max_guests, base_price_kes, is_active, property_id, display_order"
      )
      .in("property_id", propertyIds)
      .eq("is_active", true)
      .order("display_order"),
    adminClient
      .from("bookings")
      .select(
        "id, property_id, room_id, guest_name, guest_email, guest_phone, guest_count, guest_notes, check_in_date, check_out_date, nights, source, external_id, rate_per_night, subtotal_kes, discount_kes, extras_kes, total_kes, amount_paid_kes, balance_kes, status, payment_status, mpesa_ref, internal_notes, created_at"
      )
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
      .select("id, full_name, email, phone, room_id, check_in, check_out, guests, calendar_status, expires_at, listing_title, notes, property_id")
      .in("property_id", propertyIds)
      .eq("calendar_status", "pending")
      .not("room_id", "is", null)
      .not("check_in", "is", null)
      .not("check_out", "is", null)
      .gt("expires_at", new Date().toISOString()),
  ]);

  const rooms = roomsResult.data ?? [];
  const bookings = bookingsResult.data ?? [];
  const statsBookings = statsBookingsResult.data ?? [];
  const enquiries = enquiriesResult.data ?? [];

  // Fetch blocked dates after we have room IDs
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

  // Compute stats
  const occupiedTonight = bookings.filter(
    (b) => b.check_in_date <= todayStr && b.check_out_date > todayStr
  ).length;
  const checkInsToday = bookings.filter(
    (b) => b.check_in_date === todayStr
  ).length;
  const checkOutsToday = bookings.filter(
    (b) => b.check_out_date === todayStr
  ).length;
  const availableTonight = Math.max(0, rooms.length - occupiedTonight);
  const revenueThisMonth = statsBookings.reduce(
    (sum, b) => sum + (b.total_kes ?? 0),
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <Link
            href="/dashboard/property"
            className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
          >
            ← All properties
          </Link>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
            Overview Calendar
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            {properties.length} properties · {rooms.length} rooms
          </p>
        </div>
      </div>

      <UnifiedCalendarWrapper
        properties={properties}
        rooms={rooms}
        bookings={bookings}
        blockedDates={blockedDates}
        enquiries={enquiries}
        stats={{
          occupiedTonight,
          checkInsToday,
          checkOutsToday,
          availableTonight,
          revenueThisMonth,
        }}
      />
    </div>
  );
}
