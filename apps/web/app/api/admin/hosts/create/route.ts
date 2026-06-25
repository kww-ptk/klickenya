import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
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
