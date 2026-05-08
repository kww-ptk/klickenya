import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { updateOpportunityStage, GHL_STAGES } from "@/lib/integrations/ghl";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  submissionId: z.string().uuid(),
  otpCode: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    /* Fetch the submission */
    const { data: row, error } = await supabase
      .from("listing_requests")
      .select("id, otp_code, otp_expires_at, otp_verified, status, ghl_opportunity_id")
      .eq("id", data.submissionId)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    if (row.otp_verified || row.status !== "pending_otp") {
      return NextResponse.json({ error: "This code has already been used." }, { status: 400 });
    }

    if (new Date(row.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This code has expired. Please start again." },
        { status: 400 }
      );
    }

    if (row.otp_code !== data.otpCode) {
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
    }

    /* Mark verified and advance status */
    await supabase
      .from("listing_requests")
      .update({
        otp_verified: true,
        otp_verified_at: new Date().toISOString(),
        status: "submitted",
      })
      .eq("id", data.submissionId);

    /* Advance GHL to OPENED stage */
    if (row.ghl_opportunity_id) {
      try {
        await updateOpportunityStage(row.ghl_opportunity_id, GHL_STAGES.OPENED);
      } catch (ghlErr) {
        console.error("GHL stage update error:", ghlErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    console.error("Verify OTP error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
