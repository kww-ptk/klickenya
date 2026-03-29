import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSanityClient } from "next-sanity";

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify host owns this profile
    const { data: hostProfile } = await supabase
      .from("host_profiles")
      .select("sanity_host_id, user_id")
      .eq("user_id", user.id)
      .single();

    if (!hostProfile?.sanity_host_id) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const sanityHostId = formData.get("sanityHostId") as string;
    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const website = formData.get("website") as string;
    const instagram = formData.get("instagram") as string;
    const facebook = formData.get("facebook") as string;
    const phone = formData.get("phone") as string;
    const photo = formData.get("photo") as File | null;

    // Security: ensure the sanityHostId matches the host's own document
    if (sanityHostId !== hostProfile.sanity_host_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Upload photo to Sanity if provided
    let photoAssetId: string | null = null;
    if (photo && photo.size > 0) {
      if (photo.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Photo must be under 5MB" }, { status: 400 });
      }

      const buffer = Buffer.from(await photo.arrayBuffer());
      const asset = await sanityWrite.assets.upload("image", buffer, {
        filename: photo.name,
        contentType: photo.type,
      });
      photoAssetId = asset._id;
    }

    // Patch Sanity host document
    const patch: Record<string, unknown> = {
      name: name.trim(),
      bio: bio?.trim() || undefined,
      website: website?.trim() || undefined,
      instagram: instagram?.trim() || undefined,
      facebook: facebook?.trim() || undefined,
    };

    if (photoAssetId) {
      patch.photo = {
        _type: "image",
        asset: { _type: "reference", _ref: photoAssetId },
      };
    }

    await sanityWrite.patch(sanityHostId).set(patch).commit();

    // Update Supabase host_profiles
    await supabase
      .from("host_profiles")
      .update({
        display_name: name.trim(),
        ...(phone?.trim() && { phone: phone.trim() }),
      })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
