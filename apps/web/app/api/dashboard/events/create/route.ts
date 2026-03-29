import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSanityClient } from "next-sanity";
import { Resend } from "resend";

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const SANITY_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const SANITY_TOKEN = process.env.SANITY_WRITE_TOKEN!;
const resend = new Resend(process.env.RESEND_API_KEY);

/* ── Helpers ──────────────────────────────────────── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

async function uploadImageToSanity(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > 5 * 1024 * 1024) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadUrl = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/assets/images/${SANITY_DATASET}?filename=${encodeURIComponent(file.name)}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      Authorization: `Bearer ${SANITY_TOKEN}`,
    },
    body: buffer,
  });

  if (!res.ok) {
    console.error("[Event] Sanity asset upload failed:", res.status);
    return null;
  }

  const json = await res.json();
  return json.document?._id ?? null;
}

function makeImageRef(assetId: string) {
  return {
    _type: "image" as const,
    _key: assetId.replace(/^image-/, "").slice(0, 12),
    asset: { _type: "reference" as const, _ref: assetId },
  };
}

/* ── POST handler ─────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "host" && profile?.role !== "admin") {
      return NextResponse.json({ error: "Host account required" }, { status: 403 });
    }

    const { data: hostProfile } = await supabase
      .from("host_profiles")
      .select("user_id, display_name, sanity_host_id")
      .eq("user_id", user.id)
      .single();

    if (!hostProfile) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    // Fetch the host's URL slug from Sanity
    let hostSlug: string | null = null;
    if (hostProfile.sanity_host_id) {
      const hostDoc = await sanityWrite.fetch<{ slug: string } | null>(
        `*[_type == "host" && _id == $id][0]{ "slug": slug.current }`,
        { id: hostProfile.sanity_host_id }
      );
      hostSlug = hostDoc?.slug ?? null;
    }

    // 2. Parse form data
    const formData = await req.formData();
    const title = (formData.get("title") as string)?.trim();
    const subcategory = formData.get("subcategory") as string;
    const city = formData.get("city") as string;
    const shortDescription = (formData.get("shortDescription") as string)?.trim();
    const fullDescription = (formData.get("fullDescription") as string)?.trim();
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const doorsOpen = formData.get("doorsOpen") as string;
    const venueName = (formData.get("venueName") as string)?.trim();
    const venueAddress = (formData.get("venueAddress") as string)?.trim();
    const isRecurring = formData.get("isRecurring") === "true";
    const recurrenceRule = (formData.get("recurrenceRule") as string)?.trim();
    const scheduleJson = formData.get("schedule") as string | null;
    const isFree = formData.get("isFree") === "true";
    const ticketsJson = formData.get("tickets") as string | null;
    const ticketLink = (formData.get("ticketLink") as string)?.trim();
    const ageRestriction = formData.get("ageRestriction") as string;
    const totalCapacity = formData.get("totalCapacity") as string;
    const coverPhotoFile = formData.get("coverPhoto") as File | null;
    const additionalCount = parseInt(formData.get("additionalPhotoCount") as string) || 0;

    if (!title || !subcategory || !city || !shortDescription) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Check if new host
    const { count } = await supabase
      .from("events_pending")
      .select("id", { count: "exact", head: true })
      .eq("host_id", user.id)
      .eq("status", "approved");

    const isNewHost = (count ?? 0) === 0;

    // 4. Upload photos to Sanity
    const photoRefs: ReturnType<typeof makeImageRef>[] = [];

    if (coverPhotoFile) {
      const assetId = await uploadImageToSanity(coverPhotoFile);
      if (assetId) photoRefs.push(makeImageRef(assetId));
    }

    for (let i = 0; i < additionalCount; i++) {
      const file = formData.get(`photo_${i}`) as File | null;
      if (file) {
        const assetId = await uploadImageToSanity(file);
        if (assetId) photoRefs.push(makeImageRef(assetId));
      }
    }

    // 5. Parse ticket types
    let ticketTypes: { _key: string; name: string; price: number; description: string; available?: number }[] = [];
    let priceFrom: number | null = null;

    if (!isFree && ticketsJson) {
      const raw = JSON.parse(ticketsJson) as { name: string; price: string; description: string; available: string }[];
      ticketTypes = raw.map((t, i) => ({
        _key: `ticket-${i}`,
        name: t.name,
        price: parseFloat(t.price) || 0,
        description: t.description || "",
        ...(t.available ? { available: parseInt(t.available) } : {}),
      }));
      const prices = ticketTypes.map((t) => t.price).filter((p) => p > 0);
      priceFrom = prices.length > 0 ? Math.min(...prices) : null;
    }

    // 6. Build description as portable text
    const descriptionBlocks = [];
    if (shortDescription) {
      descriptionBlocks.push({
        _type: "block",
        _key: "desc-short",
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: "s1", text: shortDescription, marks: [] }],
      });
    }
    if (fullDescription) {
      descriptionBlocks.push({
        _type: "block",
        _key: "desc-full",
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: "s2", text: fullDescription, marks: [] }],
      });
    }

    // 7. Create Sanity document
    const slug = slugify(title);
    const sanityDoc = {
      _type: "listing",
      type: "event",
      status: isNewHost ? "draft" : "published",
      isVerified: !isNewHost,
      createdByHost: true,
      hostId: user.id,
      title,
      slug: { _type: "slug", current: slug },
      subcategory,
      city,
      description: descriptionBlocks,
      photos: photoRefs.length > 0 ? photoRefs : undefined,
      eventDate: startDate ? new Date(startDate).toISOString() : undefined,
      eventEndDate: endDate ? new Date(endDate).toISOString() : undefined,
      doorsOpen: doorsOpen || undefined,
      venue: venueName || undefined,
      venueAddress: venueAddress || undefined,
      isRecurring,
      recurrenceRule: isRecurring ? recurrenceRule : undefined,
      schedule: isRecurring && scheduleJson
        ? JSON.parse(scheduleJson).map((s: { day: string; startTime: string; endTime: string }, i: number) => ({
            _type: "object",
            _key: `sched-${i}`,
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime || undefined,
          }))
        : undefined,
      isFree,
      ticketTypes: ticketTypes.length > 0 ? ticketTypes : undefined,
      ticketLink: ticketLink || undefined,
      ageRestriction: ageRestriction || undefined,
      totalCapacity: totalCapacity ? parseInt(totalCapacity) : undefined,
      priceFrom,
      price: priceFrom,
      priceUnit: "ticket",
      organizer: hostProfile.display_name,
      organizerSlug: hostSlug,
      ...(hostProfile.sanity_host_id
        ? { host: { _type: "reference", _ref: hostProfile.sanity_host_id } }
        : {}),
    };

    const created = await sanityWrite.create(sanityDoc);

    // 8. Insert events_pending
    await supabase.from("events_pending").insert({
      sanity_event_id: created._id,
      host_id: user.id,
      title,
      city,
      status: isNewHost ? "pending" : "approved",
      is_new_host: isNewHost,
    });

    // 9. Admin notification for new hosts
    if (isNewHost) {
      try {
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: process.env.ADMIN_EMAIL ?? "admin@klickenya.com",
          subject: `New event pending review: ${title}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
              <h2 style="color:#16130C">New event submitted</h2>
              <p><strong>${title}</strong></p>
              <p>Host: ${hostProfile.display_name ?? "Unknown"}</p>
              <p>City: ${city}</p>
              ${startDate ? `<p>Date: ${new Date(startDate).toLocaleDateString("en-GB", { dateStyle: "medium" })}</p>` : ""}
              <p>This is a <strong>new host</strong> — review required before publishing.</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com"}/admin/events"
                 style="display:inline-block;padding:10px 24px;background:#E8A020;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">
                Review event
              </a>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("[Event] Admin notification email failed:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      slug,
      city,
      isLive: !isNewHost,
    });
  } catch (err) {
    console.error("[Event] Create error:", err);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
