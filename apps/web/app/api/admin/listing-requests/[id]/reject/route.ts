import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { updateOpportunityStage, GHL_STAGES } from "@/lib/integrations/ghl";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    await assertAdmin(req);
    const { id } = await ctx.params;

    const { data: request, error: fetchErr } = await supabase
      .from("listing_requests")
      .select("id, name, email, draft_title, business_name, status, ghl_opportunity_id")
      .eq("id", id)
      .single();

    if (fetchErr || !request) {
      return NextResponse.json({ error: "Listing request not found" }, { status: 404 });
    }

    if (request.status === "approved") {
      return NextResponse.json({ error: "Cannot reject an already-approved listing" }, { status: 409 });
    }

    await supabase
      .from("listing_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    /* Send rejection email */
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const listingName = request.draft_title || request.business_name || "your listing";
      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: request.email,
        subject: `Update on your Klickenya listing submission`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 16px; color: #16130C; margin: 0 0 16px;">Hi ${request.name},</p>
            <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;">
              Thank you for submitting <strong>${listingName}</strong> to Klickenya.
            </p>
            <p style="font-size: 14px; color: #5E5848; margin: 0 0 16px;">
              After reviewing your submission, we're unable to list it at this time. This may be due to incomplete information or the listing not meeting our current quality guidelines.
            </p>
            <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">
              If you'd like to resubmit with more detail, you're welcome to try again at{" "}
              <a href="https://klickenya.com/list" style="color: #E8A020;">klickenya.com/list</a>.
              If you believe this decision was made in error, please reply to this email.
            </p>
            <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 16px 0;" />
            <p style="font-size: 12px; color: #9C9485; margin: 0;">
              — The Klickenya Team<br />
              <a href="https://klickenya.com" style="color: #E8A020; text-decoration: none;">klickenya.com</a>
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Rejection email error:", emailErr);
    }

    /* GHL — advance to LOST */
    if (request.ghl_opportunity_id) {
      try {
        await updateOpportunityStage(request.ghl_opportunity_id, GHL_STAGES.LOST);
      } catch (ghlErr) {
        console.error("GHL stage error:", ghlErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Listing reject error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
