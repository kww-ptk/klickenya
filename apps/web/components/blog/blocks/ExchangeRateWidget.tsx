"use client";

import { useEffect, useState } from "react";

interface Rate {
  currency: string;
  flag: string;
  code: string;
  rate: number | null;
  loading: boolean;
}

export function ExchangeRateWidget() {
  const [rates, setRates] = useState<Rate[]>([
    { currency: "US Dollar", flag: "🇺🇸", code: "USD", rate: null, loading: true },
    { currency: "Euro", flag: "🇪🇺", code: "EUR", rate: null, loading: true },
    { currency: "British Pound", flag: "🇬🇧", code: "GBP", rate: null, loading: true },
  ]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [amount, setAmount] = useState<string>("100");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");

  useEffect(() => {
    async function fetchRates() {
      try {
        // Using exchangerate-api.com free tier (no key needed for open endpoint)
        const res = await fetch("https://open.er-api.com/v6/latest/KES");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();

        if (data.result === "success" && data.rates) {
          setRates((prev) =>
            prev.map((r) => ({
              ...r,
              // API gives KES→X, we want X→KES so invert
              rate: data.rates[r.code] ? 1 / data.rates[r.code] : null,
              loading: false,
            }))
          );
          setLastUpdated(
            new Date(data.time_last_update_utc).toLocaleDateString("en-KE", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      } catch {
        setRates((prev) => prev.map((r) => ({ ...r, loading: false })));
      }
    }
    fetchRates();
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const selectedRate = rates.find((r) => r.code === selectedCurrency);
  const convertedKES = selectedRate?.rate ? numAmount * selectedRate.rate : 0;

  return (
    <div className="my-8 rounded-2xl border border-border overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-dark px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <span className="text-[18px]">💱</span> Live Exchange Rates → KES
          </h3>
          {lastUpdated && (
            <span className="text-[11px] text-white/40">
              Updated {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Rate cards */}
      <div className="grid grid-cols-3 gap-px bg-border">
        {rates.map((r) => (
          <div key={r.code} className="bg-white p-4 text-center">
            <span className="text-[20px]">{r.flag}</span>
            <p className="text-[11px] text-text3 font-medium mt-1 uppercase tracking-wide">
              1 {r.code}
            </p>
            {r.loading ? (
              <div className="h-6 mt-1 flex justify-center">
                <div className="w-16 h-4 bg-surface rounded animate-pulse" />
              </div>
            ) : r.rate ? (
              <p className="text-[18px] font-bold text-dark mt-1">
                KSh {r.rate.toFixed(1)}
              </p>
            ) : (
              <p className="text-[13px] text-text3 mt-1">—</p>
            )}
          </div>
        ))}
      </div>

      {/* Converter */}
      <div className="px-5 py-4 bg-[#FAF8F5] border-t border-border">
        <p className="text-[11px] font-bold text-text3 uppercase tracking-wide mb-3">
          Quick converter
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="bg-white border border-border rounded-lg px-3 py-2 text-[14px] font-medium text-dark outline-none focus:border-amber"
            >
              {rates.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.flag} {r.code}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24 bg-white border border-border rounded-lg px-3 py-2 text-[14px] font-medium text-dark outline-none focus:border-amber text-right"
              min="0"
              step="10"
            />
          </div>
          <span className="text-text3 text-lg">=</span>
          <div className="flex-1 bg-white border border-amber/30 rounded-lg px-4 py-2 text-right">
            <span className="text-[18px] font-bold text-amber">
              KSh {convertedKES > 0 ? convertedKES.toLocaleString("en-KE", { maximumFractionDigits: 0 }) : "—"}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-text3 mt-2">
          Rates are indicative mid-market rates from{" "}
          <a
            href="https://www.xe.com/currencyconverter/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber"
          >
            open exchange rates
          </a>
          . Actual rates at banks and forex bureaus may differ.
        </p>
      </div>
    </div>
  );
}
