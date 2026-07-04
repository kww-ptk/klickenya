import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { sanityClient } from "@/lib/sanity/client";
import { createOrUpdateContact } from "@/lib/integrations/ghl";
import { contactConfirmationHtml } from "@/components/emails/ContactConfirmation";
import { contactNotificationHtml } from "@/components/emails/ContactNotification";

/**
 * POST /api/properties/booking-enquiry
 *
 * Public, anonymous room-booking ENQUIRY endpoint for the property embed
 * (/embed/booking/[slug]). Mirrors the proven contact_requests insert that
 * /api/contact already performs — same columns, same table — so there is no
 * new schema surface. Differs from /api/contact in that it is purpose-built
 * for cross-origin embeds: no Turnstile (matches the reservations embed
 * posture), in-memory rate limiting + honeypot instead, and it captures the
 * embedding website (source_origin) into the enquiry notes for attribution.
 *
 * This does NOT create a confirmed booking — instant-book stays owner-only via
 * /api/properties/bookings. The host converts the enquiry from the PMS, reusing
 * the existing convert/hold/decline flow.
 */

const internationalPhone = /^\+\d{7,15}$/;

// Hostname per the reservations embed: lowercase, at least one dot, TLD ≥2.
const HOSTNAME_REGEX = /^[a-z0-9.-]+\.[a-z]{2,}$/;
function sanitizeSourceOrigin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.length > 253) return null;
  return HOSTNAME_REGEX.test(trimmed) ? trimmed : null;
}

function sanitizeSourceRef(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const stripped = raw.replace(/<[^>]*>/g, "").trim();
  return stripped ? stripped.slice(0, 64) : null;
}

/* ── Rate limiter (same shape as /api/contact) ── */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

interface SanityListing {
  _id?: string;
  notificationEmail1?: string;
  notificationEmail2?: string;
  slug?: string;
  city?: string;
  hostId?: string;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();

    // Honeypot — bots fill hidden fields.
    if (body.website) {
      return NextResponse.json({ error: "Blocked" }, { status: 400 });
    }

    const {
      property_id,
      room_id,
      room_preference,
      listing_slug,
      property_name,
      name,
      email,
      phone,
      message,
      check_in,
      check_out,
      guests,
      source_origin,
      source_ref,
    } = body;

    /* ── Validation ── */
    if (!property_id || typeof property_id !== "string") {
      return NextResponse.json({ error: "property_id required" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }
    if (typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (typeof phone !== "string" || !internationalPhone.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid phone number with country code (e.g. +254712345678)" },
        { status: 400 },
      );
    }
    if (!check_in || !check_out || typeof check_in !== "string" || typeof check_out !== "string") {
      return NextResponse.json({ error: "check_in and check_out required" }, { status: 400 });
    }
    const guestCount =
      typeof guests === "number" && guests >= 1 && guests <= 50 ? Math.floor(guests) : 1;

    const propertyTitle =
      typeof property_name === "string" && property_name.trim()
        ? property_name.trim().slice(0, 200)
        : "Property";
    const cleanName = name.trim().slice(0, 120);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanMessage =
      typeof message === "string" && message.trim() ? message.trim().slice(0, 1000) : null;
    const roomLabel =
      typeof room_preference === "string" && room_preference.trim()
        ? room_preference.trim().slice(0, 120)
        : null;
    const roomId = typeof room_id === "string" && room_id ? room_id : null;
    const origin = sanitizeSourceOrigin(source_origin);
    const ref = sanitizeSourceRef(source_ref);

    /* ── Resolve the Sanity listing (for listing_sanity_id + notification emails) ── */
    let listing: SanityListing | null = null;
    if (typeof listing_slug === "string" && listing_slug) {
      listing = await sanityClient
        .fetch<SanityListing | null>(
          `*[_type == "listing" && slug.current == $slug][0]{
             _id, notificationEmail1, notificationEmail2, "slug": slug.current, city, hostId
           }`,
          { slug: listing_slug },
        )
        .catch(() => null);
    }

    /* ── Enquiry summary (rendered in notes + emails) ── */
    const enquirySummary: Record<string, string> = {
      "Check-in": check_in,
      "Check-out": check_out,
      Guests: String(guestCount),
    };
    if (roomLabel) enquirySummary["Room"] = roomLabel;

    const notesLines = [
      `Property: ${propertyTitle} (${property_id})`,
      `Type: stay`,
      ...(roomLabel ? [`Room: ${roomLabel}`] : []),
      ...Object.entries(enquirySummary).map(([k, v]) => `${k}: ${v}`),
      `Source: embed${origin ? ` (${origin})` : ""}${ref ? ` · ${ref}` : ""}`,
    ];

    /* ── Insert — columns mirror the proven /api/contact insert exactly ── */
    const { data: row, error: dbError } = await adminClient
      .from("contact_requests")
      .insert({
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        message: cleanMessage,
        listing_sanity_id: listing?._id ?? null,
        listing_title: propertyTitle,
        listing_type: "stay",
        guest_user_id: null,
        notes: notesLines.join("\n"),
        status: "new",
        check_in,
        check_out,
        room_id: roomId,
        property_id,
      })
      .select("id")
      .single();

    if (dbError || !row) {
      console.error("Booking enquiry DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to submit enquiry. Please try again." },
        { status: 500 },
      );
    }

    /* ── Notification emails (non-blocking, same templates as /api/contact) ── */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Host notification recipients: Sanity notification fields, fall back to
        // host_profiles email, always include admin.
        const notificationEmails: string[] = [];
        if (listing?.notificationEmail1) notificationEmails.push(listing.notificationEmail1);
        if (listing?.notificationEmail2) notificationEmails.push(listing.notificationEmail2);
        if (notificationEmails.length === 0 && listing?.hostId) {
          const { data: hostProfile } = await adminClient
            .from("host_profiles")
            .select("email")
            .eq("user_id", listing.hostId)
            .single();
          if (hostProfile?.email) notificationEmails.push(hostProfile.email);
        }
        // Decoupled fallback: no Sanity listing (e.g. resort embeds) — resolve the
        // host email from the property owner so the host is still notified.
        if (notificationEmails.length === 0) {
          const { data: prop } = await adminClient
            .from("properties")
            .select("owner_id")
            .eq("id", property_id)
            .maybeSingle();
          if (prop?.owner_id) {
            const { data: ownerProfile } = await adminClient
              .from("host_profiles")
              .select("email")
              .eq("user_id", prop.owner_id)
              .maybeSingle();
            if (ownerProfile?.email) notificationEmails.push(ownerProfile.email);
          }
        }

        // Confirmation to the guest.
        await resend.emails.send({
          from: "Klickenya Bookings <bookings@klickenya.com>",
          to: cleanEmail,
          subject: `Your enquiry: ${propertyTitle}`,
          html: contactConfirmationHtml({
            guestName: cleanName,
            listingTitle: propertyTitle,
            listingType: "stay",
            enquirySummary,
          }),
        });

        // Notification to admin + host.
        const adminEmail = process.env.ADMIN_EMAIL;
        const recipients = [
          ...(adminEmail ? [adminEmail] : []),
          ...notificationEmails,
        ].filter((e, i, arr) => arr.indexOf(e) === i);

        if (recipients.length > 0) {
          const citySlug = (listing?.city ?? "").toLowerCase().replace(/\s+/g, "-");
          const listingUrl = listing?.slug
            ? `https://klickenya.com/stays/${citySlug}/${listing.slug}`
            : "https://klickenya.com";
          await resend.emails.send({
            from: "Klickenya Bookings <bookings@klickenya.com>",
            to: recipients,
            subject: `New enquiry: ${propertyTitle}`,
            html: contactNotificationHtml({
              listingTitle: propertyTitle,
              listingType: "stay",
              listingUrl,
              guestName: cleanName,
              guestEmail: cleanEmail,
              guestPhone: cleanPhone,
              message: cleanMessage ?? undefined,
              enquiryDetails: enquirySummary,
            }),
          });
        }
      } catch (emailError) {
        console.error("Booking enquiry email error:", emailError);
      }
    }

    /* ── GHL (non-blocking) ── */
    const nameParts = cleanName.split(/\s+/);
    createOrUpdateContact({
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ") || "",
      email: cleanEmail,
      phone: cleanPhone,
    });

    return NextResponse.json({ success: true, id: row.id }, { status: 201 });
  } catch (err) {
    console.error("Booking enquiry error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
