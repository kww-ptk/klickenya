import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient as createSanityClient } from "next-sanity";
import { createClient } from "@supabase/supabase-js";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { listingInputSchema, inputToSanityFields } from "@/lib/listings/listingFields";

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req);

    const body = await req.json();
    const data = listingInputSchema.parse(body);

    /* Check slug uniqueness in Sanity */
    const existing = await sanityWrite.fetch(
      `*[_type == "listing" && slug.current == $slug][0]._id`,
      { slug: data.slug }
    );
    if (existing) {
      return NextResponse.json(
        { error: "A listing with this slug already exists. Choose a different slug." },
        { status: 409 }
      );
    }

    /* Optionally resolve host */
    let hostRef: { _type: string; _ref: string } | undefined;
    if (data.hostEmail) {
      const { data: hostProfile } = await supabase
        .from("host_profiles")
        .select("sanity_host_id")
        .eq("email", data.hostEmail)
        .single();

      if (hostProfile?.sanity_host_id) {
        hostRef = { _type: "reference", _ref: hostProfile.sanity_host_id };
      }
    }

    /* Create listing in Sanity */
    const fields = inputToSanityFields(data);
    const listing = await sanityWrite.create({
      _type: "listing",
      ...fields,
      isVerified: false,
      submissionSource: data.submissionSource || "admin",
      ...(hostRef && { host: hostRef }),
    });

    /* If host found and has sanity_host_id, append listing reference to host doc */
    if (hostRef) {
      try {
        await sanityWrite
          .patch(hostRef._ref)
          .setIfMissing({ listings: [] })
          .append("listings", [
            { _type: "reference", _ref: listing._id, _key: Math.random().toString(36).slice(2, 10) },
          ])
          .commit();
      } catch (patchErr) {
        console.error("Host listings patch error:", patchErr);
      }
    }

    return NextResponse.json({ success: true, listingId: listing._id, slug: data.slug });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return NextResponse.json(
        { error: first?.message ?? "Invalid data." },
        { status: 400 }
      );
    }
    console.error("Admin create listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
