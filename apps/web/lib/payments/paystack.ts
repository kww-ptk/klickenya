import crypto from "crypto";
import type { PaymentProvider, InitializeInput, InitializeResult } from "./types";

const BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export function kesToSubunits(amountKes: number): number {
  if (!Number.isInteger(amountKes) || amountKes < 0) {
    throw new Error(`Invalid KES amount: ${amountKes}`);
  }
  return amountKes * 100;
}

/** Paystack signs webhook bodies with HMAC-SHA512 of the raw body using the
 *  secret key, sent in the x-paystack-signature header. */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  let b: Buffer;
  try {
    b = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

export const paystackProvider: PaymentProvider = {
  name: "paystack",

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    const res = await fetch(`${BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: kesToSubunits(input.amountKes),
        currency: "KES",
        reference: input.orderId,
        callback_url: input.callbackUrl,
        metadata: input.metadata ?? {},
      }),
    });
    const json = await res.json();
    if (!res.ok || !json?.status || !json?.data?.authorization_url) {
      throw new Error(`Paystack initialize failed: ${json?.message ?? res.status}`);
    }
    return { checkoutUrl: json.data.authorization_url, providerRef: input.orderId };
  },

  async verifyTransaction(providerRef: string): Promise<boolean> {
    const res = await fetch(
      `${BASE}/transaction/verify/${encodeURIComponent(providerRef)}`,
      { headers: { Authorization: `Bearer ${secretKey()}` } },
    );
    if (!res.ok) return false;
    const json = await res.json();
    return json?.status === true && json?.data?.status === "success";
  },
};
