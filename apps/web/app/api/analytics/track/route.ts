import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_EVENTS = [
  "page_view",
  "contact_click",
  "contact_sent",
  "phone_click",
  "whatsapp_click",
  "directions_click",
  "photo_view",
  "share_click",
  "website_click",
] as const;

const BOT_PATTERN = /bot|crawler|spider|crawling|googlebot|bingbot|yandex|baidu|duckduck|slurp|ia_archiver|facebookexternalhit|twitterbot|linkedinbot|semrush|ahrefs|mj12bot/i;

function detectDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile";
  return "desktop";
}

function hashSession(ip: string, ua: string): string {
  // Simple non-PII fingerprint: truncated hash of IP + UA
  let hash = 0;
  const str = `${ip}::${ua}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingSlug, listingType, city, eventType, hostUserId, referrer } = body;

    if (!listingSlug || !eventType) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (!VALID_EVENTS.includes(eventType)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ua = request.headers.get("user-agent") ?? "";

    // Skip bots
    if (BOT_PATTERN.test(ua)) {
      return NextResponse.json({ ok: true });
    }

    // Skip localhost / preview
    const host = request.headers.get("host") ?? "";
    if (host.includes("localhost") || host.includes("vercel.app")) {
      return NextResponse.json({ ok: true });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";

    const sessionId = hashSession(ip, ua);
    const device = detectDevice(ua);

    // Rate limit: max 10 inserts per session per listing per hour
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from("listing_events")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("listing_slug", listingSlug)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 10) {
      return NextResponse.json({ ok: true });
    }

    await supabase.from("listing_events").insert({
      listing_slug: listingSlug,
      listing_type: listingType ?? null,
      city: city ?? null,
      event_type: eventType,
      host_user_id: hostUserId ?? null,
      session_id: sessionId,
      referrer: referrer ?? null,
      device,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
