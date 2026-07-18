import crypto from "crypto";

// Crockford base32 minus ambiguous chars — easy to read aloud / type at a gate.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const DOOR_CODE_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;

/** 6 chars * 5 bits = 30 bits. Not brute-forceable given the redeem rate limit. */
export function generateDoorCode(): string {
  const bytes = crypto.randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[bytes[i] % 32];
  return out;
}

/** sha256 of the normalized (trim+uppercase) code — codes are stored hashed. */
export function hashDoorCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
