import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifyPartnerKey, resolvePartnerOwner } from "@/lib/partner/auth";

/**
 * GET /api/partner/submissions?partner=<partner_id>
 * Authorization: Bearer <partner's key from PARTNER_API_KEYS>
 *
 * Read-only feed for a partner site's own admin panel (e.g. Claris African
 * Experience) to pull its villa enquiries, contact messages, and newsletter
 * signups out of Klickenya — no separate database needed on the partner side.
 * Server-to-server only; never called from a browser.
 */

type Submission = {
  id: string;
  type: "enquiry" | "contact" | "newsletter";
  status: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  subject: string | null;
  room_name: string | null;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }

  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = await resolvePartnerOwner(partner);
  if (!ownerId) {
    return NextResponse.json({ submissions: [] satisfies Submission[] });
  }

  const { data: ownedProps } = await adminClient
    .from("properties")
    .select("id")
    .eq("owner_id", ownerId);
  const propertyIds = (ownedProps ?? []).map((p) => p.id);

  const ENQUIRY_SELECT =
    "id, full_name, email, phone, message, listing_title, status, created_at, check_in, check_out, guests";

  const [enquiriesRes, contactsRes, newsletterRes] = await Promise.all([
    propertyIds.length
      ? adminClient
          .from("contact_requests")
          .select(ENQUIRY_SELECT)
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    adminClient
      .from("general_contacts")
      .select("id, name, email, subject, message, created_at")
      .ilike("subject", `[${partner}]%`)
      .order("created_at", { ascending: false })
      .limit(200),
    adminClient
      .from("newsletter_subscribers")
      .select("id, email, created_at")
      .eq("source", partner)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const submissions: Submission[] = [
    ...(enquiriesRes.data ?? []).map(
      (r): Submission => ({
        id: `enquiry-${r.id}`,
        type: "enquiry",
        status: (r.status as string) ?? null,
        name: (r.full_name as string) ?? null,
        email: r.email as string,
        phone: (r.phone as string) ?? null,
        message: (r.message as string) ?? null,
        subject: null,
        room_name: (r.listing_title as string) ?? null,
        check_in: (r.check_in as string) ?? null,
        check_out: (r.check_out as string) ?? null,
        guests: (r.guests as number) ?? null,
        created_at: r.created_at as string,
      })
    ),
    ...(contactsRes.data ?? []).map(
      (r): Submission => ({
        id: `contact-${r.id}`,
        type: "contact",
        status: null,
        name: r.name,
        email: r.email,
        phone: null,
        message: r.message,
        subject: r.subject,
        room_name: null,
        check_in: null,
        check_out: null,
        guests: null,
        created_at: r.created_at,
      })
    ),
    ...(newsletterRes.data ?? []).map(
      (r): Submission => ({
        id: `newsletter-${r.id}`,
        type: "newsletter",
        status: null,
        name: null,
        email: r.email,
        phone: null,
        message: null,
        subject: null,
        room_name: null,
        check_in: null,
        check_out: null,
        guests: null,
        created_at: r.created_at,
      })
    ),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json({ submissions });
}
