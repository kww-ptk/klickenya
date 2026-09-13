import crypto from "crypto";
import { NextRequest } from "next/server";

/**
 * Rider device session — the same shape as the POS staff session: a signed
 * cookie, no Supabase account, a shift-length expiry.
 *
 * Riders work from cheap phones on bad networks. Handing them an email/
 * password account means password resets at 9pm on a motorbike; the
 * device-session pattern is already proven twice here (POS staff, event door
 * scanner) and is the right shape for a third time.
 *
 * The PIN handling is NOT copied from POS. restaurant_staff (054) stores a
 * 4-digit PIN in plaintext and compares it directly. A rider's PIN releases
 * cash, and with the phone number known it is 10,000 guesses — so it gets
 * scrypt with a per-rider salt, a timing-safe compare, and lockout.
 */

export const RIDER_SESSION_COOKIE = "rider-session";
const SHIFT_LENGTH_SECONDS = 12 * 60 * 60;

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export interface RiderSession {
  rider_id: string;
  name: string;
  exp: number; // unix seconds
}

function getSecret(): string {
  const secret =
    process.env.POS_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Rider sessions need POS_JWT_SECRET, JWT_SECRET or SUPABASE_SERVICE_ROLE_KEY set.",
    );
  }
  return secret;
}

/* ── PIN hashing ─────────────────────────────────────────────────────── */

export function makePinHash(pin: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPin(pin: string, hash: string, salt: string): boolean {
  try {
    const candidate = crypto.scryptSync(pin, salt, 64);
    const expected = Buffer.from(hash, "hex");
    // Lengths must match before timingSafeEqual, which throws otherwise.
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/* ── Session token ───────────────────────────────────────────────────── */

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64url");

export function signRiderSession(payload: Omit<RiderSession, "exp">): string {
  const body: RiderSession = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SHIFT_LENGTH_SECONDS,
  };
  const encoded = b64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", getSecret()).update(encoded).digest();
  return `${encoded}.${b64url(sig)}`;
}

export function verifyRiderSession(token: string | undefined | null): RiderSession | null {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(given, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as RiderSession;
    if (!payload.rider_id || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null; // shift over
    return payload;
  } catch {
    return null;
  }
}

export function getRiderSession(req: NextRequest): RiderSession | null {
  return verifyRiderSession(req.cookies.get(RIDER_SESSION_COOKIE)?.value);
}

export const RIDER_SESSION_MAX_AGE = SHIFT_LENGTH_SECONDS;
