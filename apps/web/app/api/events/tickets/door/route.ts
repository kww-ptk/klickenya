import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { DOOR_CODE_RE, hashDoorCode } from "@/lib/tickets/doorCode";
import { signDoorSession, DOOR_SESSION_COOKIE } from "@/lib/tickets/doorSession";

// Per-instance in-memory limiter — a stopgap (resets on cold start, not shared
// across instances). Adequate for a low-QPS gate redeem; note as such.
const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) { attempts.set(ip, { count: 1, resetAt: now + 10 * 60_000 }); return false; }
  rec.count++;
  return rec.count > 10;
}

const schema = z.object({ code: z.string().trim().toUpperCase().regex(DOOR_CODE_RE) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts — wait a few minutes" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const { data: row } = await adminClient
    .from("event_door_codes")
    .select("event_sanity_id, label")
    .eq("code_hash", hashDoorCode(parsed.data.code))
    .is("revoked_at", null)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });

  const { token, maxAge } = signDoorSession({ event_sanity_id: row.event_sanity_id, label: row.label });
  const res = NextResponse.json({ ok: true, label: row.label });
  res.cookies.set(DOOR_SESSION_COOKIE, token, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge, path: "/",
  });
  return res;
}
