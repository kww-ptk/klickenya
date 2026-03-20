import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { adminReplyHtml } from "@/components/emails/AdminReply";

const resend = new Resend(process.env.RESEND_API_KEY);

/* Parse listing info and enquiry details from the notes field */
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
    await assertAdmin(request);
    const { id } = await params;
    const { message, subject, status = "info" } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["approved", "rejected", "pending", "info"];
    const replyStatus = validStatuses.includes(status) ? status : "info";

    const { data: contactRequest, error: fetchError } = await adminClient
      .from("contact_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !contactRequest) {
      return NextResponse.json(
        { error: "Contact request not found" },
        { status: 404 }
      );
    }

    const { listingTitle, listingType, enquiryDetails } = parseNotes(
      contactRequest.notes
    );

    const guestName = contactRequest.full_name || "there";

    const emailSubject =
      subject || `Re: Your enquiry about ${listingTitle || "your booking"}`;

    await resend.emails.send({
      from: "Klickenya <hello@klickenya.com>",
      to: contactRequest.email,
      subject: emailSubject,
      html: adminReplyHtml({
        guestName,
        listingTitle,
        listingType,
        enquiryDetails,
        status: replyStatus as "approved" | "rejected" | "pending" | "info",
        replyMessage: message,
      }),
    });

    // Update status to "responded"
    const { error: updateError } = await adminClient
      .from("contact_requests")
      .update({ status: "responded" })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
