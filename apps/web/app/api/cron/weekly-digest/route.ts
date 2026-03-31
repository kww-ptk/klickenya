import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { weeklyDigestHtml } from "@/lib/email/weeklyDigest";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all hosts who haven't unsubscribed
    const { data: hosts } = await adminClient
      .from("host_profiles")
      .select("user_id, display_name, email, digest_unsubscribed")
      .eq("digest_unsubscribed", false);

    if (!hosts || hosts.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const now = Date.now();
    const thisWeekSince = new Date(now - 7 * 86400_000).toISOString();
    const lastWeekSince = new Date(now - 14 * 86400_000).toISOString();

    let sent = 0;

    for (const host of hosts) {
      if (!host.email || !host.user_id) continue;

      // This week's events
      const { data: thisWeek } = await adminClient
        .from("listing_events")
        .select("event_type")
        .eq("host_user_id", host.user_id)
        .gte("created_at", thisWeekSince);

      const events = thisWeek ?? [];
      const views = events.filter((e) => e.event_type === "page_view").length;

      // Skip if no views
      if (views === 0) continue;

      const contactClicks = events.filter((e) => e.event_type === "contact_click").length;
      const enquiriesSent = events.filter((e) => e.event_type === "contact_sent").length;
      const phoneTaps = events.filter((e) => e.event_type === "phone_click").length;

      // Last week for comparison
      const { data: lastWeek } = await adminClient
        .from("listing_events")
        .select("event_type")
        .eq("host_user_id", host.user_id)
        .gte("created_at", lastWeekSince)
        .lt("created_at", thisWeekSince);

      const lastViews = (lastWeek ?? []).filter((e) => e.event_type === "page_view").length;
      const changePercent = lastViews > 0 ? Math.round(((views - lastViews) / lastViews) * 100) : null;

      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: host.email,
        subject: `Your Klickenya stats this week — ${views} people viewed your listing`,
        html: weeklyDigestHtml({
          hostName: host.display_name ?? "Host",
          views,
          contactClicks,
          enquiriesSent,
          phoneTaps,
          changePercent,
        }),
      }).catch((err) => console.error(`Digest email failed for ${host.email}:`, err));

      sent++;
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error("Weekly digest cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
