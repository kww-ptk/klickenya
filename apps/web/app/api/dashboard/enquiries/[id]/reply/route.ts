import { NextRequest, NextResponse } from "next/server";
import { assertHostOwnsEnquiry, HostAuthError } from "@/lib/dashboard/auth";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { adminReplyHtml } from "@/components/emails/AdminReply";

const resend = new Resend(process.env.RESEND_API_KEY);

function parseNotes(notes: string | null): {
  listingTitle: string;
  listingType: string;
  enquiryDetails: [string, string][];
} {
  if (!notes) return { listingTitle: "", listingType: "", enquiryDetails: [] };

  const lines = notes.split("\n");
  let listingTitle = "";
  let listingType = "";
  const enquiryDetails: [string, string][] = [];

  for (const line of lines) {
    if (line.startsWith("--- ")) break;
    const listingMatch = line.match(/^Listing:\s*(.+?)(?:\s*\(.*?\))?\s*$/);
    const typeMatch = line.match(/^Type:\s*(.+)$/);

    if (listingMatch) {
      listingTitle = listingMatch[1];
    } else if (typeMatch) {
      listingType = typeMatch[1];
    } else if (line.includes(": ")) {
      const [key, ...rest] = line.split(": ");
      enquiryDetails.push([key.trim(), rest.join(": ").trim()]);
    }
  }

  return { listingTitle, listingType, enquiryDetails };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { contactRequest, hostProfile } = await assertHostOwnsEnquiry(request, id);
    const { message, subject, status = "info" } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const validStatuses = ["approved", "rejected", "pending", "info"];
    const replyStatus = validStatuses.includes(status) ? status : "info";

    const { listingTitle, listingType, enquiryDetails } = parseNotes(contactRequest.notes);
    const guestName = contactRequest.full_name || "there";
    const emailSubject = subject || `Re: Your enquiry about ${contactRequest.listing_title || listingTitle || "your booking"}`;
    const messageId = `<cr-${id}-${Date.now()}@klickenya.com>`;

    // Look up host email for replyTo
    const { data: hostUser } = await adminClient
      .from("users")
      .select("email")
      .eq("id", hostProfile.user_id)
      .single();
    const replyTo = hostUser?.email ?? "hello@klickenya.com";

    await resend.emails.send({
      from: "Klickenya Bookings <bookings@klickenya.com>",
      to: contactRequest.email,
      replyTo,
      subject: emailSubject,
      headers: {
        "Message-ID": messageId,
        "X-Klickenya-Request-ID": id,
      },
      html: adminReplyHtml({
        guestName,
        listingTitle: contactRequest.listing_title || listingTitle,
        listingType: contactRequest.listing_type || listingType,
        enquiryDetails,
        status: replyStatus as "approved" | "rejected" | "pending" | "info",
        replyMessage: message,
      }),
    });

    // Send confirmation to host
    if (replyTo !== "hello@klickenya.com") {
      await resend.emails.send({
        from: "Klickenya Bookings <bookings@klickenya.com>",
        to: replyTo,
        subject: `Reply sent: ${contactRequest.listing_title || listingTitle || "Enquiry"}`,
        html: `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <p style="color:#16130C;font-size:14px;line-height:1.6;">Your reply to <strong>${guestName}</strong> has been sent.</p>
          <div style="margin:16px 0;padding:16px;background:#F5F3F0;border-radius:8px;">
            <p style="margin:0;font-size:13px;color:#5E5848;white-space:pre-wrap;">${message}</p>
          </div>
          <p style="font-size:12px;color:#9C9485;">Status: ${replyStatus} · <a href="https://klickenya.com/dashboard/enquiries/${id}" style="color:#E8A020;">View in dashboard</a></p>
        </div>`,
      }).catch(() => {});
    }

    // Append reply to notes
    const now = new Date().toISOString();
    const replyLog = `\n\n--- HOST REPLY [${now}] ---\nStatus: ${replyStatus}\nSubject: ${emailSubject}\n${message}`;
    const updatedNotes = (contactRequest.notes || "") + replyLog;

    await adminClient
      .from("contact_requests")
      .update({ status: "responded", notes: updatedNotes })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof HostAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Host reply error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
