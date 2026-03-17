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

    const { data: contact, error: fetchError } = await adminClient
      .from("general_contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !contact) {
      return NextResponse.json(
        { error: "General contact not found" },
        { status: 404 }
      );
    }

    const emailSubject =
      subject || `Re: ${contact.subject || "Your message to Klickenya"}`;

    await resend.emails.send({
      from: "Klickenya <hello@klickenya.com>",
      to: contact.email,
      subject: emailSubject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
    <p>Hi ${contact.name},</p>
    ${message
      .split("\n")
      .map((p: string) => `<p>${p}</p>`)
      .join("")}
    <hr style="border:none;border-top:1px solid #E2DDD5;margin:24px 0;" />
    <p style="font-size:13px;color:#9C9485;">Klickenya — Discover Kenya</p>
  </div>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
