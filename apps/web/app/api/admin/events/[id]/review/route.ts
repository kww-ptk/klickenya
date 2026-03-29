import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSanityClient } from "next-sanity";
import { Resend } from "resend";

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body.action as "approve" | "reject";
    const reason = body.reason as string | undefined;

    // Auth check — admin only
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Fetch event
    const { data: event } = await supabase
      .from("events_pending")
      .select("*")
      .eq("id", id)
      .single();

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.status !== "pending") return NextResponse.json({ error: "Event already reviewed" }, { status: 400 });

    // Get host email
    const { data: hostUser } = await supabase
      .from("users")
      .select("email")
      .eq("id", event.host_id)
      .single();

    const hostEmail = hostUser?.email;

    if (action === "approve") {
      // Patch Sanity: publish + verify
      if (event.sanity_event_id) {
        await sanityWrite
          .patch(event.sanity_event_id)
          .set({ status: "published", isVerified: true })
          .commit();
      }

      // Update events_pending
      await supabase
        .from("events_pending")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", id);

      // Send host notification
      if (hostEmail) {
        try {
          await resend.emails.send({
            from: "Klickenya <hello@klickenya.com>",
            to: hostEmail,
            subject: `Your event "${event.title}" is now live!`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                <h2 style="color:#16130C">Your event is live! 🎉</h2>
                <p>Great news — <strong>${event.title}</strong> has been approved and is now visible on Klickenya.</p>
                <p>Share it with your audience and start getting attendees!</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com"}/events"
                   style="display:inline-block;padding:10px 24px;background:#E8A020;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">
                  View your event
                </a>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("[Admin] Approval email failed:", emailErr);
        }
      }

      return NextResponse.json({ success: true, action: "approved" });
    }

    if (action === "reject") {
      // Update events_pending
      await supabase
        .from("events_pending")
        .update({
          status: "rejected",
          rejection_reason: reason ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Send host notification
      if (hostEmail) {
        try {
          await resend.emails.send({
            from: "Klickenya <hello@klickenya.com>",
            to: hostEmail,
            subject: `Update on your event "${event.title}"`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                <h2 style="color:#16130C">Event update</h2>
                <p>Unfortunately, your event <strong>${event.title}</strong> was not approved.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
                <p>You can submit a new event or reach out to us at <a href="mailto:hello@klickenya.com">hello@klickenya.com</a> if you have questions.</p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("[Admin] Rejection email failed:", emailErr);
        }
      }

      return NextResponse.json({ success: true, action: "rejected" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Admin] Event review error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
