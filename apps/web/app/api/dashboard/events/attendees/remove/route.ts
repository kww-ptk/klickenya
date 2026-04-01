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
    const { attendeeId, eventSanityId } = body as {
      attendeeId: string;
      eventSanityId: string;
    };

    if (!attendeeId || !eventSanityId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user owns this event
    const event = await sanityClient.fetch<{ title: string; hostId: string | null } | null>(
      `*[_type == "listing" && _id == $id][0]{ title, hostId }`,
      { id: eventSanityId }
    );

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

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

    // Get the attendee info before updating
    const { data: attendee } = await adminClient
      .from("event_attendees")
      .select("id, name, email")
      .eq("id", attendeeId)
      .eq("event_sanity_id", eventSanityId)
      .single();

    if (!attendee) return NextResponse.json({ error: "Attendee not found" }, { status: 404 });

    // Update status to cancelled
    await adminClient
      .from("event_attendees")
      .update({ status: "cancelled" })
      .eq("id", attendeeId);

    // Notify the attendee
    try {
      const html = wrap(`
        <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Event Update</h1>
        <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${attendee.name},</p>
        <p style="font-size:14px;color:#333;line-height:1.6;">Your attendance for <strong>${event.title}</strong> has been cancelled by the event organiser.</p>
        <p style="font-size:14px;color:#333;line-height:1.6;">If you have any questions, please contact the event organiser directly.</p>
        <p style="margin-top:24px;font-size:12px;color:#9C9485;">This is an automated message from Klickenya.</p>
      `);

      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: attendee.email,
        subject: `Your attendance for ${event.title} has been cancelled`,
        html,
      });
    } catch (err) {
      console.error("[Remove Attendee] Email failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Remove Attendee] Error:", err);
    return NextResponse.json({ error: "Failed to remove attendee" }, { status: 500 });
  }
}
