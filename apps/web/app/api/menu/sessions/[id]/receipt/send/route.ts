import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { adminClient } from "@/lib/supabase/admin";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import { loadFullBillForSession, getMenuIdForSession } from "../../../_lib/sessions";
import { renderBillPdf } from "../../../_lib/billPdf";
import { buildBillText, formatNairobiDate } from "../../../_lib/bill";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/menu/sessions/[id]/receipt/send
 * Body: { email: string }
 * Sends the bill PDF as a Resend attachment. Email failures DO NOT throw —
 * they return 200 with { ok: false, error } so the UI can toast a friendly
 * message without crashing the bill flow.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const menuId = await getMenuIdForSession(id);
  if (!menuId) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const auth = await getPosOrOwnerAuth(req, menuId);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { email?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  if (!email || !EMAIL_RX.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const full = await loadFullBillForSession(id);
  if (!full) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "Email not configured" }, { status: 200 });
  }

  const pdf = renderBillPdf(full);
  const dateLabel = formatNairobiDate(full.opened_at);
  const subject = `Your bill from ${full.restaurant.name} — ${dateLabel}`;
  const textBody = buildBillText(full.bill, full.restaurant, full.table_number, {
    paymentMethod: full.payment_method,
    mpesaRef:      full.mpesa_ref,
    openedAt:      full.opened_at,
  });

  const fromAddress = process.env.RESEND_FROM_BILLS || "Klickenya Bills <bills@klickenya.com>";

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const datePart = dateLabel.replace(/\s+/g, "-");
    const restoSlug = full.restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const filename = `receipt-${restoSlug}-${datePart}-table-${full.table_number}.pdf`;

    const result = await resend.emails.send({
      from:    fromAddress,
      to:      email,
      subject,
      text:    textBody,
      attachments: [
        {
          filename,
          content: pdf.toString("base64"),
        },
      ],
    });

    if (result.error) {
      console.error("[receipt/send] resend error:", result.error);
      return NextResponse.json(
        { ok: false, error: "Email failed to send" },
        { status: 200 },
      );
    }

    // Stamp the session so the dashboard can show "receipt emailed".
    await adminClient
      .from("table_sessions")
      .update({
        receipt_sent_at: new Date().toISOString(),
        receipt_sent_to: email,
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, sent_to: email });
  } catch (err) {
    console.error("[receipt/send] exception:", err);
    return NextResponse.json(
      { ok: false, error: "Email failed to send" },
      { status: 200 },
    );
  }
}
