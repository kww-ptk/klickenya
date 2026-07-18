import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { resolveOwnedEvent } from "@/lib/events/ownedEvent";
import { generateDoorCode, hashDoorCode } from "@/lib/tickets/doorCode";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await resolveOwnedEvent(supabase, user.id, id);
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = z.object({ label: z.string().trim().max(40).optional() }).safeParse(await req.json().catch(() => ({})));
  const label = parsed.success ? parsed.data.label ?? null : null;

  const code = generateDoorCode();
  const { data, error } = await adminClient
    .from("event_door_codes")
    .insert({ event_sanity_id: owned.sanityEventId, code_hash: hashDoorCode(code), label, created_by: user.id })
    .select("id, label, created_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "Could not create code" }, { status: 500 });
  // Plaintext code returned ONCE — never stored or returned again.
  return NextResponse.json({ id: data.id, code, label: data.label, created_at: data.created_at });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await resolveOwnedEvent(supabase, user.id, id);
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = z.object({ codeId: z.string().uuid() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await adminClient
    .from("event_door_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.codeId)
    .eq("event_sanity_id", owned.sanityEventId)  // can only revoke this event's codes
    .is("revoked_at", null);
  return NextResponse.json({ ok: true });
}
