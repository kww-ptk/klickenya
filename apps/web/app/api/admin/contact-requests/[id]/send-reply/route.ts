import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;
    const { message, subject } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

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

    const emailSubject =
      subject || `Re: Your enquiry about ${contactRequest.listing_title}`;

    await resend.emails.send({
      from: "Klickenya <hello@klickenya.com>",
      to: contactRequest.email,
      subject: emailSubject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
    <p>Hi ${contactRequest.name},</p>
    ${message
      .split("\n")
      .map((p: string) => `<p>${p}</p>`)
      .join("")}
    <hr style="border:none;border-top:1px solid #E2DDD5;margin:24px 0;" />
    <p style="font-size:13px;color:#9C9485;">Klickenya — Discover Kenya</p>
  </div>`,
    });

    const { error: updateError } = await adminClient
      .from("contact_requests")
      .update({ status: "responded" })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
