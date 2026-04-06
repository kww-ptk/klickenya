-- Migration 041: Add p_guest_user_id to create_booking_with_payment RPC
-- Nullable with default null so all existing callers continue to work unchanged.

create or replace function public.create_booking_with_payment(
  p_property_id uuid,
  p_room_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_count int,
  p_check_in_date date,
  p_check_out_date date,
  p_rate_per_night numeric,
  p_subtotal_kes numeric,
  p_discount_kes numeric,
  p_total_kes numeric,
  p_amount_paid_kes numeric,
  p_payment_status text,
  p_source text,
  p_guest_notes text,
  p_internal_notes text,
  p_payment_method text,
  p_recorded_by uuid,
  p_guest_user_id uuid default null   -- new: links booking to a platform guest account
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_booking_id uuid;
begin
  -- Insert booking
  insert into public.bookings (
    property_id, room_id, guest_name, guest_phone, guest_email,
    guest_count, check_in_date, check_out_date, rate_per_night,
    subtotal_kes, discount_kes, total_kes, amount_paid_kes,
    payment_status, source, guest_notes, internal_notes, status,
    guest_user_id
  ) values (
    p_property_id, p_room_id, p_guest_name, p_guest_phone, p_guest_email,
    p_guest_count, p_check_in_date, p_check_out_date, p_rate_per_night,
    p_subtotal_kes, p_discount_kes, p_total_kes, p_amount_paid_kes,
    p_payment_status, p_source, p_guest_notes, p_internal_notes, 'confirmed',
    p_guest_user_id
  )
  returning id into v_booking_id;

  -- Insert payment if amount > 0
  if p_amount_paid_kes > 0 and p_payment_method is not null then
    insert into public.booking_payments (
      booking_id, amount_kes, method, recorded_by
    ) values (
      v_booking_id, p_amount_paid_kes, p_payment_method, p_recorded_by
    );
  end if;

  return v_booking_id;
end;
$$;
