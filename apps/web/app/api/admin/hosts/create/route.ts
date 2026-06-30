import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { findAuthUserByEmail } from "@/lib/admin/findAuthUserByEmail";
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
    // admin can't become a host. Resolve against auth.users (the source of truth
    // for "already registered") — an auth user may lack a public.users row (it
    // is created on login, not signup), so a public.users-only lookup misses
    // those accounts and the create would fail with a raw error.
    const existingUser = await findAuthUserByEmail(email);
    if (existingUser) {
      const [{ data: pub }, { data: existingHost }] = await Promise.all([
        adminClient
          .from("users")
          .select("role")
          .eq("id", existingUser.id)
          .maybeSingle(),
        adminClient
          .from("host_profiles")
          .select("id")
          .eq("user_id", existingUser.id)
          .maybeSingle(),
      ]);
      if (pub?.role === "admin") {
        return NextResponse.json({ conflict: "admin" }, { status: 409 });
      }
      if (pub?.role === "host" || existingHost) {
        return NextResponse.json(
          { conflict: "host", hostId: existingHost?.id ?? null },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { conflict: "guest", email, name, userId: existingUser.id },
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
