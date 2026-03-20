import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Resend webhook endpoint
 *
 * Handles two event types:
 * 1. email.delivered / email.opened / email.bounced — delivery tracking
 * 2. Inbound emails (replies from users) — requires Resend inbound domain setup
 *
 * Setup:
 * - Go to Resend dashboard → Webhooks → Add webhook
 * - URL: https://klickenya.com/api/webhooks/resend
 * - Events: email.delivered, email.bounced, email.complained
 * - For inbound replies: Resend → Domains → Add inbound domain (MX records)
 */

// Verify webhook signature (optional but recommended)
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = body.type;

    // --- Handle inbound email (user reply) ---
    if (eventType === "email.received" || body.from) {
      return handleInboundReply(body);
    }

    // --- Handle delivery events ---
    if (eventType === "email.bounced" || eventType === "email.complained") {
      console.warn(`[Resend] ${eventType}:`, body.data?.email_id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Resend webhook] Error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

async function handleInboundReply(body: Record<string, unknown>) {
  try {
    // Resend inbound format
    const data = (body.data || body) as Record<string, unknown>;
    const from = (data.from as string) || "";
    const subject = (data.subject as string) || "";
    const text = (data.text as string) || (data.html as string) || "";
    const headers = (data.headers as Record<string, string>[]) || [];

    // Try to find the contact request ID from headers or subject
    let requestId: string | null = null;

    // Check X-Klickenya-Request-ID in In-Reply-To chain
    for (const h of headers) {
      if (h.name === "In-Reply-To" || h.name === "References") {
        const match = h.value?.match(/cr-([a-f0-9-]+)-/);
        if (match) {
          requestId = match[1];
          break;
        }
      }
    }

    // Fallback: search by sender email
    if (!requestId && from) {
      const emailMatch = from.match(/<(.+?)>/) || [null, from];
      const senderEmail = emailMatch[1];
      if (senderEmail) {
        const { data: requests } = await adminClient
          .from("contact_requests")
          .select("id")
          .eq("email", senderEmail)
          .order("created_at", { ascending: false })
          .limit(1);
        if (requests?.[0]) {
          requestId = requests[0].id;
        }
      }
    }

    if (!requestId) {
      console.warn("[Resend inbound] Could not match reply to contact request:", { from, subject });
      return NextResponse.json({ received: true, matched: false });
    }

    // Fetch existing contact request
    const { data: cr } = await adminClient
      .from("contact_requests")
      .select("notes")
      .eq("id", requestId)
      .single();

    if (!cr) {
      return NextResponse.json({ received: true, matched: false });
    }

    // Append user reply to notes
    const now = new Date().toISOString();
    // Clean the text: remove quoted reply content
    const cleanText = text
      .split(/\n.*On .* wrote:/)[0] // Remove "On ... wrote:" quoted section
      .trim()
      .slice(0, 2000); // Limit length

    const replyLog = `\n\n--- USER REPLY [${now}] ---\nFrom: ${from}\nSubject: ${subject}\n${cleanText}`;
    const updatedNotes = (cr.notes || "") + replyLog;

    await adminClient
      .from("contact_requests")
      .update({ notes: updatedNotes })
      .eq("id", requestId);

    return NextResponse.json({ received: true, matched: true, requestId });
  } catch (err) {
    console.error("[Resend inbound] Error processing reply:", err);
    return NextResponse.json({ error: "Failed to process reply" }, { status: 500 });
  }
}
