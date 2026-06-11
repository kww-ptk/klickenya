import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { createHostAccount } from "@/lib/admin/createHost";

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req);
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steps: string[] = [];
  try {
    const form = await req.formData();
    const name = (form.get("name") as string)?.trim();
    const slug = (form.get("slug") as string)?.trim().toLowerCase();
    const colorPrimary = (form.get("colorPrimary") as string) || undefined;
    const colorAccent = (form.get("colorAccent") as string) || undefined;
    const colorDark = (form.get("colorDark") as string) || undefined;
    const fontDisplay = (form.get("fontDisplay") as string) || undefined;
    const fontBody = (form.get("fontBody") as string) || undefined;
    const domain = (form.get("domain") as string)?.trim().toLowerCase() || "";
    const enabledModules = JSON.parse((form.get("enabledModules") as string) || '["restaurant"]') as string[];
    const allowedListingTypes = JSON.parse((form.get("allowedListingTypes") as string) || '["stay","experience"]') as string[];
    const listingId = (form.get("listingId") as string) || "";
    const hostEmail = (form.get("hostEmail") as string)?.trim().toLowerCase() || "";
    const hostName = (form.get("hostName") as string)?.trim() || name;
    const hostPhone = (form.get("hostPhone") as string)?.trim() || null;
    const logo = form.get("logo") as File | null;

    // 1. Validate
    if (!name || !slug) return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "Slug must be lowercase letters, numbers, hyphens" }, { status: 400 });
    if (!enabledModules.length) return NextResponse.json({ error: "Pick at least one module" }, { status: 400 });
    if (!hostEmail) return NextResponse.json({ error: "Client email is required" }, { status: 400 });

    const existing = await sanityWriteClient.fetch<{ _id: string } | null>(
      `*[_type == "partner" && slug.current == $slug][0]{ _id }`, { slug }
    );
    if (existing) return NextResponse.json({ error: `A partner with slug "${slug}" already exists` }, { status: 409 });

    if (listingId) {
      const listing = await sanityClient.fetch<{ _id: string; partner?: unknown } | null>(
        `*[_type == "listing" && _id == $id][0]{ _id, partner }`, { id: listingId }
      );
      if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 400 });
      if (listing.partner) return NextResponse.json({ error: "That listing is already assigned to a partner" }, { status: 409 });
    }

    // 2. Logo upload (optional)
    let logoField: Record<string, unknown> | undefined;
    if (logo && logo.size > 0) {
      const buffer = Buffer.from(await logo.arrayBuffer());
      const asset = await sanityWriteClient.assets.upload("image", buffer, { filename: logo.name });
      logoField = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
      steps.push("logo-uploaded");
    }

    // 3. Create the partner doc
    const partner = await sanityWriteClient.create({
      _type: "partner",
      name,
      slug: { _type: "slug", current: slug },
      domains: domain ? [domain] : [],
      ...(logoField ? { logo: logoField } : {}),
      poweredByKlickenya: true,
      ...(colorPrimary ? { colorPrimary } : {}),
      ...(colorAccent ? { colorAccent } : {}),
      ...(colorDark ? { colorDark } : {}),
      ...(fontDisplay ? { fontDisplay } : {}),
      ...(fontBody ? { fontBody } : {}),
      enabledModules,
      allowedListingTypes,
    });
    steps.push("partner-created");

    // 4. Assign the listing
    if (listingId) {
      await sanityWriteClient.patch(listingId)
        .set({ partner: { _type: "reference", _ref: partner._id } })
        .commit();
      steps.push("listing-assigned");
    }

    // 5. Host (create new, or link existing) + partner_id  ← LAST (most consequential)
    const { data: existingHost } = await adminClient
      .from("host_profiles").select("id").eq("email", hostEmail).maybeSingle();
    if (existingHost) {
      await adminClient.from("host_profiles").update({ partner_id: slug }).eq("id", existingHost.id);
      steps.push("host-linked");
    } else {
      await createHostAccount({ name: hostName, email: hostEmail, phone: hostPhone, partnerId: slug });
      steps.push("host-created");
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
    return NextResponse.json({
      success: true,
      partnerId: partner._id,
      slug,
      storefrontUrl: `${siteUrl}/w/${slug}`,
      domain: domain || null,
      steps,
    }, { status: 201 });
  } catch (err) {
    console.error("[admin/partners POST] error:", err);
    return NextResponse.json(
      { error: "Partner creation failed partway — completed steps: " + (steps.join(", ") || "none"), steps },
      { status: 500 }
    );
  }
}
