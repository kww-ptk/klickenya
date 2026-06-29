import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { findAuthUserByEmail } from "@/lib/admin/findAuthUserByEmail";
import { upgradeGuestToHost } from "@/lib/admin/upgradeGuestToHost";

export async function POST(request: NextRequest) {
  try {
    await assertAdmin(request);
    const { email, name, phone } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    const existingUser = await findAuthUserByEmail(email);

    if (!existingUser) {
      return NextResponse.json(
        { error: "No account found for that email" },
        { status: 404 }
      );
    }
    const { data: pub } = await adminClient
      .from("users")
      .select("role")
      .eq("id", existingUser.id)
      .maybeSingle();
    if (pub?.role === "admin") {
      return NextResponse.json(
        { error: "Admin accounts can't be hosts" },
        { status: 409 }
      );
    }

    const result = await upgradeGuestToHost({
      userId: existingUser.id,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: (phone ? String(phone) : "").trim() || null,
    });

    revalidatePath("/admin/hosts");
    return NextResponse.json({
      success: true,
      hostId: result.hostId,
      slug: result.slug,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Upgrade host error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
