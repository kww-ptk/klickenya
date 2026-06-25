import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import {
  updateHostAccount,
  HostEmailConflictError,
} from "@/lib/admin/updateHost";
import { deleteHostAccount } from "@/lib/admin/deleteHost";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;
    const { name, email, phone, password } = await request.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }
    if (password && String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await updateHostAccount({
      id,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      password: password || null,
    });

    revalidatePath(`/admin/hosts/${id}`);
    revalidatePath("/admin/hosts");

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof HostEmailConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Update host error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;

    await deleteHostAccount({ id });

    revalidatePath("/admin/hosts");

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Delete host error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
