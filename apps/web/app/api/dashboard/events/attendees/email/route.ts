import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { wrap } from "@/lib/email/hostEmails";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { eventSanityId, attendeeIds, subject, message } = body as {
      eventSanityId: string;
      attendeeIds?: string[];
      subject: string;
      message: string;
    };

    if (!eventSanityId || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user owns this event
    const { data: hostProfile } = await supabase
      .from("host_profiles")
      .select("sanity_host_id")
      .eq("user_id", user.id)
      .single();

    const event = await sanityClient.fetch<{ title: string; hostId: string | null } | null>(
      `*[_type == "listing" && _id == $id][0]{ title, hostId }`,
      { id: eventSanityId }
    );

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Check ownership via hostId or events_pending
    const ownsViaSanity = event.hostId === user.id;
    const { data: pendingMatch } = await supabase
      .from("events_pending")
      .select("id")
      .eq("sanity_event_id", eventSanityId)
      .eq("host_id", user.id)
      .maybeSingle();

    if (!ownsViaSanity && !pendingMatch) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Get host email for reply-to
    const { data: userProfile } = await supabase
      .from("users")
      .select("email")
      .eq("id", user.id)
      .single();

    // Fetch attendees to email
    let query = adminClient
      .from("event_attendees")
      .select("id, name, email")
      .eq("event_sanity_id", eventSanityId)
      .eq("status", "confirmed");

    if (attendeeIds && attendeeIds.length > 0) {
      query = query.in("id", attendeeIds);
    }

    const { data: attendees } = await query;
    if (!attendees || attendees.length === 0) {
      return NextResponse.json({ error: "No attendees found" }, { status: 404 });
    }

    // Send emails
    const html = wrap(`
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">${subject}</h1>
      <p style="font-size:14px;color:#333;line-height:1.6;">Regarding <strong>${event.title}</strong>:</p>
      <div style="margin:16px 0;padding:16px;background:#F5F3F0;border-radius:8px;">
        <p style="margin:0;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${message}</p>
      </div>
      <p style="margin-top:24px;font-size:12px;color:#9C9485;">This message was sent by the event organiser via Klickenya. You can reply directly to this email.</p>
    `);

    let sent = 0;
    for (const attendee of attendees) {
      try {
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          replyTo: userProfile?.email ?? undefined,
          to: attendee.email,
          subject,
          html,
        });
        sent++;
      } catch (err) {
        console.error(`[Email Attendee] Failed to send to ${attendee.email}:`, err);
      }
    }

    return NextResponse.json({ sent, total: attendees.length });
  } catch (err) {
    console.error("[Email Attendee] Error:", err);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}
