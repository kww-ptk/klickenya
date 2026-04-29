import crypto from "crypto";
import { NextRequest } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * POS staff session — a lightweight signed token stored in an HTTPOnly cookie.
 *
 * This is NOT Supabase Auth. Staff have no auth.users row. They identify with
 * a 4-digit PIN unique to their menu, and the server hands back this signed
 * cookie which expires after a 12-hour shift.
 *
 * Format: base64url(JSON payload).base64url(HMAC-SHA256 signature)
 *
 * No external JWT library is used — Node's built-in crypto is enough for an
 * HMAC-signed token with no nesting/encryption needs.
 */

export const POS_SESSION_COOKIE = "pos-staff-session";
const SHIFT_LENGTH_SECONDS = 12 * 60 * 60; // 12 hours

export interface PosStaffSession {
  staff_id:   string;
  menu_id:    string;
  staff_name: string;
  role:       "waiter" | "manager" | "cashier" | "kitchen";
  exp:        number; // unix seconds
}

/* ── Secret resolution ──────────────────────────────────────────────────────── */
// Prefer a dedicated POS_JWT_SECRET; otherwise fall back to whatever signing
// secret the deploy already exposes. Throws at first use if nothing is
// configured — better to fail loudly than to sign with a hardcoded constant.

function getSecret(): string {
  const secret =
    process.env.POS_JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "POS auth secret missing — set POS_JWT_SECRET (or SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return secret;
}

/* ── base64url helpers ──────────────────────────────────────────────────────── */

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/* ── Sign / verify ──────────────────────────────────────────────────────────── */

export function signPosSession(
  data: Omit<PosStaffSession, "exp"> & { ttlSeconds?: number },
): { token: string; exp: number; maxAge: number } {
  const ttl = data.ttlSeconds ?? SHIFT_LENGTH_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload: PosStaffSession = {
    staff_id:   data.staff_id,
    menu_id:    data.menu_id,
    staff_name: data.staff_name,
    role:       data.role,
    exp,
  };

  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest();
  const sigB64 = b64url(sig);

  return { token: `${payloadB64}.${sigB64}`, exp, maxAge: ttl };
}

export function verifyPosSession(token: string | undefined | null): PosStaffSession | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let expected: Buffer;
  try {
    expected = crypto
      .createHmac("sha256", getSecret())
      .update(payloadB64)
      .digest();
  } catch {
    return null;
  }
  const provided = fromB64url(sigB64);
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(expected, provided)) return null;

  let payload: PosStaffSession;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload.staff_id !== "string" ||
    typeof payload.menu_id !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/* ── Reader for API routes ──────────────────────────────────────────────────── */

/**
 * Read the POS staff session from the cookie on the request.
 * Returns null if the cookie is missing, malformed, or expired.
 */
export function getPosStaffSession(req: NextRequest): PosStaffSession | null {
  const token = req.cookies.get(POS_SESSION_COOKIE)?.value;
  return verifyPosSession(token);
}

/* ── Combined owner-or-staff auth ───────────────────────────────────────────── */
// Used by /api/menu/sessions endpoints: either the owner (Supabase Auth) or a
// signed-in staff member can manage table sessions for a menu.

import { getMenuAuth, verifyMenuAccess } from "@/app/api/menu/_lib/auth";

export type PosOrOwnerAuth =
  | { type: "staff"; staffId: string; staffName: string; role: PosStaffSession["role"]; menuId: string }
  | { type: "owner"; userId: string; isAdmin: boolean; menuId: string };

/**
 * Authorise a request for a given menu using either owner credentials
 * (Supabase Auth) or staff credentials (POS cookie). Returns null if neither
 * is valid for this menu.
 *
 * Caller must pass the requested menuId — the staff cookie is already scoped
 * to a menu, and we cross-check it here so a staff member from menu A cannot
 * call session endpoints for menu B.
 */
export async function getPosOrOwnerAuth(
  req: NextRequest,
  menuId: string,
): Promise<PosOrOwnerAuth | null> {
  // Try staff first (cheap — just cookie verification).
  const staff = getPosStaffSession(req);
  if (staff && staff.menu_id === menuId) {
    // Confirm staff is still active in DB (they may have been deactivated mid-shift).
    const { data: row } = await adminClient
      .from("restaurant_staff")
      .select("id, is_active, menu_id")
      .eq("id", staff.staff_id)
      .single();
    if (row && row.is_active && row.menu_id === menuId) {
      return {
        type: "staff",
        staffId: staff.staff_id,
        staffName: staff.staff_name,
        role: staff.role,
        menuId,
      };
    }
    // Staff cookie present but invalid for this menu — fall through to owner.
  }

  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return null;

  const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  if (!access) return null;

  return { type: "owner", userId, isAdmin, menuId };
}
