"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES } from "@/lib/real-estate/constants";
import { formatPriceFull } from "@/lib/real-estate/format";

/* 16px inputs: anything smaller makes iOS Safari zoom on focus. */
const fieldCls =
  "w-full rounded-[12px] border-[1.5px] border-border bg-white px-4 py-3 text-[16px] text-text outline-none transition-colors focus:border-purple2 placeholder:text-text3";

const labelCls = "mb-1.5 block text-[13px] font-bold text-text";

interface Result {
  estimatedValue: number;
  rangeMin: number;
  rangeMax: number;
  confidence: string;
}

function ValuationForm({ neighbourhoods }: { neighbourhoods: string[] }) {
  const [neighbourhood, setNeighbourhood] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [bedrooms, setBedrooms] = useState("2");
  const [sizeSqm, setSizeSqm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/real-estate/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neighbourhood: neighbourhood.trim(),
          propertyType,
          bedrooms: Number(bedrooms),
          sizeSqm: Number(sizeSqm),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(
          data.error ??
            data.errors?.[0]?.message ??
            "We could not produce an estimate. Check the details and try again."
        );
        setStatus("error");
        return;
      }

      setResult(data);
      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done" && result) {
    return (
      <div className="rounded-[28px] border border-border bg-white p-7 shadow-lg">
        <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.07em] text-purple2">
          Estimated value
        </p>
        <p className="font-display text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.03em] text-dark">
          {formatPriceFull(result.estimatedValue)}
        </p>
        <p className="mt-2 text-[15px] text-text2">
          Likely range {formatPriceFull(result.rangeMin)} to{" "}
          {formatPriceFull(result.rangeMax)}
        </p>

        <div className="mt-5 rounded-[16px] bg-surface p-4 text-[13.5px] leading-[1.65] text-text2">
          This is an automated estimate based on average prices per square metre
          in {neighbourhood || "the area"}, adjusted for property type and
          bedroom count. It is a starting point, not a formal valuation. For a
          figure a bank or a buyer will accept, instruct a registered valuer.
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setResult(null);
            }}
            className="flex-1 rounded-[16px] border border-border py-3.5 text-[14.5px] font-bold text-text2 transition-colors hover:border-text3"
          >
            Value another property
          </button>
          <Link
            href="/real-estate/list"
            className="flex-1 rounded-[16px] bg-purple2 py-3.5 text-center text-[14.5px] font-bold text-white transition-colors hover:bg-[#9B5ABF]"
          >
            List this property
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-border bg-white p-7 shadow-lg"
    >
      <div className="mb-5">
        <label className={labelCls} htmlFor="val-neighbourhood">
          Neighbourhood
        </label>
        <input
          id="val-neighbourhood"
          list="valuation-neighbourhoods"
          required
          className={fieldCls}
          placeholder="Kilimani, Nyali, Watamu..."
          value={neighbourhood}
          onChange={(e) => setNeighbourhood(e.target.value)}
        />
        <datalist id="valuation-neighbourhoods">
          {neighbourhoods.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="val-type">
            Property type
          </label>
          <select
            id="val-type"
            className={fieldCls}
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="val-beds">
            Bedrooms
          </label>
          <select
            id="val-beds"
            className={fieldCls}
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Studio" : n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className={labelCls} htmlFor="val-size">
          Size in square metres
        </label>
        <input
          id="val-size"
          type="text"
          inputMode="numeric"
          required
          className={fieldCls}
          placeholder="e.g. 120"
          value={sizeSqm}
          onChange={(e) => setSizeSqm(e.target.value.replace(/\D/g, ""))}
        />
        <p className="mt-1.5 text-[12.5px] text-text3">
          Between 10 and 5,000 m&sup2;. One acre is roughly 4,047 m&sup2;.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-[12px] bg-[#EF4444]/10 px-4 py-3 text-[13.5px] font-medium text-[#EF4444]"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className={cn(
          "flex h-13 w-full items-center justify-center gap-2 rounded-[16px] py-4 text-[15px] font-bold transition-all",
          "bg-gradient-to-r from-amber to-amber2 text-dark shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
          "hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        )}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Calculating
          </>
        ) : (
          <>
            <TrendingUp className="size-4" />
            Get my estimate
          </>
        )}
      </button>

      <p className="mt-3 text-center text-[12.5px] text-text3">
        Free, instant, and no contact details required.
      </p>
    </form>
  );
}

export { ValuationForm };
