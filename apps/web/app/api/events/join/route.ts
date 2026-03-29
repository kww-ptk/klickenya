import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventSanityId, name, email, phone, userId } = body as {
      eventSanityId: string;
      name: string;
      email: string;
      phone?: string;
      userId?: string;
    };

    if (!eventSanityId || !name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Check for duplicate
    const { data: existing } = await adminClient
      .from("event_attendees")
      .select("id")
      .eq("event_sanity_id", eventSanityId)
      .eq("email", email.trim().toLowerCase())
      .eq("status", "confirmed")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You've already joined this event" }, { status: 409 });
    }

    // Insert attendee
    await adminClient.from("event_attendees").insert({
      event_sanity_id: eventSanityId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      user_id: userId || null,
      status: "confirmed",
    });

    // Get attendee count
    const { count } = await adminClient
      .from("event_attendees")
      .select("id", { count: "exact", head: true })
      .eq("event_sanity_id", eventSanityId)
      .eq("status", "confirmed");

    // Fetch event info from Sanity for emails
    const event = await sanityClient.fetch<{
      title: string;
      city: string | null;
      venue: string | null;
      eventDate: string | null;
      organizer: string | null;
      hostId: string | null;
      hostRef: { name: string } | null;
      notificationEmail1: string | null;
    } | null>(
      `*[_type == "listing" && _id == $id][0]{
        title, city, venue, eventDate, organizer, hostId,
        "hostRef": host->{ name },
        notificationEmail1
      }`,
      { id: eventSanityId }
    );

    const eventTitle = event?.title ?? "Event";
    const hostName = event?.organizer ?? event?.hostRef?.name ?? "Host";
    const eventDate = event?.eventDate
      ? new Date(event.eventDate).toLocaleDateString("en-GB", { dateStyle: "medium" })
      : null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";

    // Resolve host email: try notificationEmail1, then look up from Supabase via hostId
    let hostEmail = event?.notificationEmail1 ?? null;
    if (!hostEmail && event?.hostId) {
      const { data: hostUser } = await adminClient
        .from("users")
        .select("email")
        .eq("id", event.hostId)
        .single();
      hostEmail = hostUser?.email ?? null;
    }

    // Email to attendee
    try {
      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: email.trim().toLowerCase(),
        subject: `You're in! ${eventTitle}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#16130C">You're joining ${eventTitle}! 🎉</h2>
            <p>Hi ${name.trim()},</p>
            <p>You've confirmed your spot for <strong>${eventTitle}</strong>.</p>
            ${event?.venue ? `<p><strong>Venue:</strong> ${event.venue}${event.city ? `, ${event.city}` : ""}</p>` : ""}
            ${eventDate ? `<p><strong>Date:</strong> ${eventDate}</p>` : ""}
            <p>The organiser (${hostName}) has been notified. They may reach out with more details.</p>
            <p style="margin-top:20px;color:#9C9485;font-size:13px">See you there!</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[Join] Attendee email failed:", emailErr);
    }

    // Email to host
    if (hostEmail) {
      try {
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: hostEmail,
          subject: `${name.trim()} wants to join ${eventTitle}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
              <h2 style="color:#16130C">New attendee for ${eventTitle}</h2>
              <p><strong>${name.trim()}</strong> has joined your event.</p>
              <p><strong>Email:</strong> ${email.trim()}</p>
              ${phone ? `<p><strong>Phone:</strong> ${phone.trim()}</p>` : ""}
              <p>Total confirmed attendees: <strong>${count ?? 1}</strong></p>
              <a href="${siteUrl}/dashboard/events"
                 style="display:inline-block;padding:10px 24px;background:#E8A020;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">
                View attendees
              </a>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("[Join] Host email failed:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      attendeeCount: count ?? 1,
    });
  } catch (err) {
    console.error("[Join] Error:", err);
    return NextResponse.json({ error: "Failed to join event" }, { status: 500 });
  }
}
