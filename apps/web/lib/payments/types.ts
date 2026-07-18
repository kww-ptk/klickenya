// Provider-agnostic payment interface. Paystack is the first implementation;
// Daraja STK push slots in later as a second one without touching routes.

export type InitializeInput = {
  orderId: string;          // becomes the provider reference
  amountKes: number;        // whole KES, > 0
  email: string;
  callbackUrl: string;      // where the guest lands after paying
  metadata?: Record<string, string>;
};

export type InitializeResult = {
  checkoutUrl: string;      // redirect the guest here
  providerRef: string;
};

export interface PaymentProvider {
  readonly name: "paystack" | "daraja";
  initialize(input: InitializeInput): Promise<InitializeResult>;
  /** Server-to-server confirmation — used by the callback poller as a
   *  webhook fallback. Returns true only for a successful charge. */
  verifyTransaction(providerRef: string): Promise<boolean>;
}
