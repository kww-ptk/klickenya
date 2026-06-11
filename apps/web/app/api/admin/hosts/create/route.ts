import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createHostAccount } from "@/lib/admin/createHost";

export async function POST(request: NextRequest) {
  try {
    await assertAdmin(request);
    const { name, email, phone } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    const { hostId, slug } = await createHostAccount({ name, email, phone });

    return NextResponse.json({ success: true, hostId, slug }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error) {
      // Preserve structured errors from createHostAccount (e.g. duplicate email)
      console.error("Create host error:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.error("Create host error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
