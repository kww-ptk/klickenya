import crypto from "crypto";

// Crockford base32 minus ambiguous chars — safe to read aloud at a door.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const TICKET_CODE_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{20}$/;

/** 20 chars * 5 bits = 100 bits of entropy — unguessable, DB-lookup validated. */
export function generateTicketCode(): string {
  const bytes = crypto.randomBytes(20);
  let out = "";
  for (let i = 0; i < 20; i++) out += ALPHABET[bytes[i] % 32];
  return out;
}
