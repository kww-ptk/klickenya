import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
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

    const { data: existing } = await adminClient
      .from("users")
      .select("id, role")
      .eq("email", String(email).trim().toLowerCase())
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "No account found for that email" },
        { status: 404 }
      );
    }
    if (existing.role === "admin") {
      return NextResponse.json(
        { error: "Admin accounts can't be hosts" },
        { status: 409 }
      );
    }

    const result = await upgradeGuestToHost({
      userId: existing.id,
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
