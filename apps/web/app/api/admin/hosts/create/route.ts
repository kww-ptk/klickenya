import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createHostAccount } from "@/lib/admin/createHost";

export async function POST(request: NextRequest) {
  try {
    await assertAdmin(request);
    const { name, email, phone, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email and password are required" },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // If the email already belongs to an account, branch on its role instead of
    // failing: a guest can be upgraded to host, a host already exists, and an
    // admin can't become a host.
    const { data: existing } = await adminClient
      .from("users")
      .select("id, role")
      .eq("email", String(email).trim().toLowerCase())
      .maybeSingle();
    if (existing) {
      if (existing.role === "admin") {
        return NextResponse.json({ conflict: "admin" }, { status: 409 });
      }
      const { data: existingHost } = await adminClient
        .from("host_profiles")
        .select("id")
        .eq("user_id", existing.id)
        .maybeSingle();
      if (existing.role === "host" || existingHost) {
        return NextResponse.json(
          { conflict: "host", hostId: existingHost?.id ?? null },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { conflict: "guest", email, name, userId: existing.id },
        { status: 409 }
      );
    }

    const { hostId, slug } = await createHostAccount({
      name,
      email,
      phone,
      password,
    });

    return NextResponse.json({ success: true, hostId, slug }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error) {
      console.error("Create host error:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.error("Create host error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
