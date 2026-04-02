import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createClient as createSanityClient } from "next-sanity";

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { sanityId } = await request.json();

    if (!sanityId) {
      return NextResponse.json({ error: "sanityId is required" }, { status: 400 });
    }

    await sanityWrite
      .patch(sanityId)
      .set({
        isVerified: true,
        verificationStatus: "verified",
      })
      .commit();

    const { id } = await params;
    revalidatePath(`/admin/hosts/${id}`);
    revalidatePath("/dashboard");

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Verify listing error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
