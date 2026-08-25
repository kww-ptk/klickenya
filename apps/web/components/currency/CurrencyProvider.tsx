"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_CURRENCY,
  convert,
  roundConverted,
  toCurrency,
  type Currency,
  type KesRates,
} from "@/lib/real-estate/currency";

/**
 * The viewer's display currency, plus the rates needed to honour it.
 *
 * Deliberately placed in the root layout rather than under /real-estate: the
 * same preference should eventually drive stays, events and tickets, and the
 * only thing standing between here and there is which components call the hook.
 * Nothing outside real estate consumes it yet.
 */

export const CURRENCY_COOKIE = "klickenya_currency";

interface CurrencyContextValue {
  /** What the viewer chose, or the default when they have not chosen. */
  currency: Currency;
  rates: KesRates;
  /** When the rates were published upstream; null means the built-in fallback. */
  ratesUpdatedAt: string | null;
  isLive: boolean;
  setCurrency: (next: Currency) => void;
  /**
   * Converted and rounded to a precision a daily rate can support. Returns null
   * when no conversion is needed, so callers can skip the "approximately"
   * treatment entirely.
   */
  convertFor: (amount: number, from: Currency) => number | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function CurrencyProvider({
  children,
  initialCurrency,
  rates,
  ratesUpdatedAt,
  isLive,
}: {
  children: React.ReactNode;
  initialCurrency: string | undefined;
  rates: KesRates;
  ratesUpdatedAt: string | null;
  isLive: boolean;
}) {
  const router = useRouter();
  const [currency, setLocal] = useState<Currency>(toCurrency(initialCurrency));

  const setCurrency = useCallback(
    (next: Currency) => {
      setLocal(next);
      // A year, so the choice survives; Lax so it still applies on inbound links.
      document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // Server components render prices too, so they need to hear about this.
      router.refresh();
    },
    [router]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      rates,
      ratesUpdatedAt,
      isLive,
      setCurrency,
      convertFor: (amount, from) =>
        from === currency ? null : roundConverted(convert(amount, from, currency, rates)),
    }),
    [currency, rates, ratesUpdatedAt, isLive, setCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/**
 * Falls back to shillings and the built-in rates when no provider is present,
 * so a component rendered outside the tree shows a real price rather than
 * throwing.
 */
function useDisplayCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  return {
    currency: DEFAULT_CURRENCY,
    rates: { KES: 1, EUR: 150, USD: 130, GBP: 175 },
    ratesUpdatedAt: null,
    isLive: false,
    setCurrency: () => {},
    convertFor: () => null,
  };
}

export { CurrencyProvider, useDisplayCurrency };
