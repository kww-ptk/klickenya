import type { PaymentProvider } from "./types";
import { paystackProvider } from "./paystack";

export function getPaymentProvider(name: "paystack" | "daraja" = "paystack"): PaymentProvider {
  if (name === "paystack") return paystackProvider;
  throw new Error(`Payment provider not implemented: ${name}`);
}
export type { PaymentProvider } from "./types";
