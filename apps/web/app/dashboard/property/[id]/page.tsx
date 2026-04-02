import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { CalendarGrid } from "./_components/CalendarGrid";

export default async function PropertyDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  // Fetch property
  const { data: property } = await adminClient
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!property) notFound();

  // Parallel: rooms, today's bookings, 60-day bookings, 60-day blocked dates
  const todayStr = new Date().toISOString().split("T")[0];
  const sixtyDaysOut = new Date();
  sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);
  const sixtyStr = sixtyDaysOut.toISOString().split("T")[0];

  const [roomsResult, checkInsResult, checkOutsResult, bookingsResult, blockedResult] =
    await Promise.all([
      adminClient
        .from("rooms")
        .select("id, name, room_number, room_type, max_guests, base_price_kes, is_active")
        .eq("property_id", id)
        .eq("is_active", true)
        .order("display_order"),
      adminClient
        .from("bookings")
        .select("id, guest_name, room_id, check_in_date, check_out_date, status, source")
        .eq("property_id", id)
        .eq("check_in_date", todayStr)
        .neq("status", "cancelled"),
      adminClient
        .from("bookings")
        .select("id, guest_name, room_id, check_in_date, check_out_date, status, source")
        .eq("property_id", id)
        .eq("check_out_date", todayStr)
        .neq("status", "cancelled"),
      adminClient
        .from("bookings")
        .select(
          "id, room_id, guest_name, guest_email, guest_phone, guest_count, guest_notes, check_in_date, check_out_date, nights, source, external_id, rate_per_night, subtotal_kes, discount_kes, extras_kes, total_kes, amount_paid_kes, balance_kes, status, payment_status, mpesa_ref, internal_notes, created_at"
        )
        .eq("property_id", id)
        .neq("status", "cancelled")
        .lt("check_in_date", sixtyStr)
        .gt("check_out_date", todayStr),
      adminClient
        .from("blocked_dates")
        .select("id, room_id, start_date, end_date, reason")
        .in(
          "room_id",
          // We'll filter by property rooms — fetch room IDs first inline
          (
            await adminClient
              .from("rooms")
              .select("id")
              .eq("property_id", id)
          ).data?.map((r) => r.id) ?? []
        )
        .lt("start_date", sixtyStr)
        .gt("end_date", todayStr),
    ]);

  const rooms = roomsResult.data ?? [];
  const checkIns = checkInsResult.data ?? [];
  const checkOuts = checkOutsResult.data ?? [];
  const bookings = bookingsResult.data ?? [];
  const blockedDates = blockedResult.data ?? [];

  const availableTonight = rooms.length - checkIns.length;

  const typeLabels: Record<string, string> = {
    villa: "Villa / Holiday Home",
    hotel: "Hotel",
    guesthouse: "Guesthouse",
    apartment: "Apartment",
    cottage: "Beach Cottage",
    camp: "Safari Camp",
  };

  // If no rooms, show setup prompt
  if (rooms.length === 0) {
    return (
      <div>
        <div className="mb-5">
          <Link href="/dashboard/property" className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors">
            ← All properties
          </Link>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
            {property.name}
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            {typeLabels[property.property_type] ?? property.property_type}
            {property.city ? ` · ${property.city}` : ""}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-[28px]">🛏️</span>
          </div>
          <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
            No rooms set up yet
          </p>
          <p className="text-[13px] text-[#9C9485] mb-4 max-w-[320px] mx-auto">
            Add your rooms to start managing availability and bookings on the calendar.
          </p>
          <Link
            href={`/dashboard/property/new?edit=${property.id}`}
            className="inline-block bg-[#4F46E5] text-white font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#4338CA] transition-colors shadow-sm"
          >
            Set up rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <Link href="/dashboard/property" className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors">
            ← All properties
          </Link>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
            {property.name}
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            {typeLabels[property.property_type] ?? property.property_type}
            {property.city ? ` · ${property.city}` : ""}
          </p>
        </div>
        <Link
          href={`/dashboard/property/new?edit=${property.id}`}
          className="text-[13px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          Settings
        </Link>
      </div>

      {/* Today's Snapshot */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-5">
        <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] py-3 px-2 lg:p-4 text-center shadow-sm">
          <p className="font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none text-[#16A34A]">
            {checkIns.length}
          </p>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">
            Checking in
          </p>
        </div>
        <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] py-3 px-2 lg:p-4 text-center shadow-sm">
          <p className="font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none text-[#E8A020]">
            {checkOuts.length}
          </p>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">
            Checking out
          </p>
        </div>
        <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] py-3 px-2 lg:p-4 text-center shadow-sm">
          <p className="font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none text-[#4F46E5]">
            {availableTonight < 0 ? 0 : availableTonight}
          </p>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">
            Available tonight
          </p>
        </div>
      </div>

      {/* Today's check-ins list */}
      {checkIns.length > 0 && (
        <div className="mb-4 bg-white rounded-xl border border-[#E2DDD5] p-3 shadow-sm">
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
            Arriving today
          </p>
          <div className="space-y-1.5">
            {checkIns.map((b) => {
              const room = rooms.find((r) => r.id === b.room_id);
              return (
                <div key={b.id} className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[#16130C]">{b.guest_name}</span>
                  <span className="text-[#9C9485]">{room?.name ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's check-outs list */}
      {checkOuts.length > 0 && (
        <div className="mb-5 bg-white rounded-xl border border-[#E2DDD5] p-3 shadow-sm">
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
            Departing today
          </p>
          <div className="space-y-1.5">
            {checkOuts.map((b) => {
              const room = rooms.find((r) => r.id === b.room_id);
              return (
                <div key={b.id} className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[#16130C]">{b.guest_name}</span>
                  <span className="text-[#9C9485]">{room?.name ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Availability Calendar */}
      <div className="mb-5">
        <h2 className="font-display text-[17px] lg:text-[20px] font-bold text-[#16130C] tracking-[-0.02em] mb-3">
          Availability Calendar
        </h2>
        <CalendarGrid
          propertyId={property.id}
          rooms={rooms}
          bookings={bookings}
          blockedDates={blockedDates}
        />
      </div>
    </div>
  );
}
