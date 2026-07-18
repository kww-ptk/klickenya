import crypto from "crypto";
import { NextRequest } from "next/server";

// Signed HttpOnly cookie scoping a gate device to ONE event for a shift.
// Mirrors apps/web/app/api/pos/_lib/auth.ts (base64url(JSON).base64url(HMAC-SHA256)).
export const DOOR_SESSION_COOKIE = "event-door-session";
const SESSION_SECONDS = 12 * 60 * 60;

export interface DoorSession {
  event_sanity_id: string;
  label: string | null;
  exp: number; // unix seconds
}

function getSecret(): string {
  const secret =
    process.env.POS_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error("Door session secret missing — set POS_JWT_SECRET.");
  return secret;
}
function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signDoorSession(data: {
  event_sanity_id: string;
  label: string | null;
  ttlSeconds?: number;
}): { token: string; maxAge: number } {
  const ttl = data.ttlSeconds ?? SESSION_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload: DoorSession = { event_sanity_id: data.event_sanity_id, label: data.label, exp };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  return { token: `${payloadB64}.${b64url(sig)}`, maxAge: ttl };
}

export function verifyDoorSession(token: string | undefined | null): DoorSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const expected = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  let given: Buffer;
  try { given = fromB64url(sigB64); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let payload: DoorSession;
  try { payload = JSON.parse(fromB64url(payloadB64).toString("utf8")); } catch { return null; }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function getDoorSession(req: NextRequest): DoorSession | null {
  return verifyDoorSession(req.cookies.get(DOOR_SESSION_COOKIE)?.value);
}
