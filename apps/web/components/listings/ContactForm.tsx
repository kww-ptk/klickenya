"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

interface ContactFormProps {
  listingId: string;
  listingTitle: string;
  listingType: string;
  price: number;
  priceUnit: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

function ContactForm({
  listingId,
  listingTitle,
  listingType,
  price,
  priceUnit,
}: ContactFormProps) {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isBookable = ["stay", "experience", "event"].includes(listingType);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    // Stub: replace with actual server action
    console.log("Contact form submitted:", {
      listingId,
      listingTitle,
      ...form,
    });

    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <span className="text-[40px] block mb-3">✅</span>
        <p className="text-[17px] font-semibold text-text mb-1">
          Request sent!
        </p>
        <p className="text-[14px] text-text2">
          The host will get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Price display */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="font-display text-[26px] font-extrabold tracking-[-0.02em] text-dark">
          KSh {price.toLocaleString()}
        </span>
        <span className="text-[15px] text-text2">/ {priceUnit}</span>
      </div>

      {/* Date fields */}
      {isBookable && (
        <div className="grid grid-cols-2 border border-border rounded-[14px] overflow-hidden">
          <div className="p-3 border-r border-border">
            <label className="block text-[10.5px] font-bold text-text2 uppercase tracking-wide mb-0.5">
              Check-in
            </label>
            <input
              type="date"
              value={form.checkIn}
              onChange={(e) => update("checkIn", e.target.value)}
              className="w-full text-[14px] text-text bg-transparent outline-none"
              required
            />
          </div>
          <div className="p-3">
            <label className="block text-[10.5px] font-bold text-text2 uppercase tracking-wide mb-0.5">
              Check-out
            </label>
            <input
              type="date"
              value={form.checkOut}
              onChange={(e) => update("checkOut", e.target.value)}
              className="w-full text-[14px] text-text bg-transparent outline-none"
              required
            />
          </div>
        </div>
      )}

      {/* Guests */}
      {isBookable && (
        <div className="flex items-center justify-between border border-border rounded-[14px] p-3">
          <div>
            <span className="block text-[10.5px] font-bold text-text2 uppercase tracking-wide">
              Guests
            </span>
            <span className="text-[14px] text-text">
              {form.guests} guest{form.guests !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => update("guests", Math.max(1, form.guests - 1))}
              className="size-8 rounded-full border border-border flex items-center justify-center text-[18px] text-text2 hover:border-dark transition-colors"
              aria-label="Decrease guests"
            >
              -
            </button>
            <span className="text-[15px] font-semibold w-5 text-center">
              {form.guests}
            </span>
            <button
              type="button"
              onClick={() => update("guests", Math.min(20, form.guests + 1))}
              className="size-8 rounded-full border border-border flex items-center justify-center text-[18px] text-text2 hover:border-dark transition-colors"
              aria-label="Increase guests"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Contact fields */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Your name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
          className="w-full border border-border rounded-[14px] px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors"
        />
        <input
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
          className="w-full border border-border rounded-[14px] px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors"
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          className="w-full border border-border rounded-[14px] px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors"
        />
        <textarea
          placeholder="Your message (optional)"
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          rows={3}
          className="w-full border border-border rounded-[14px] px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors resize-none"
        />
      </div>

      {/* Reserve / Contact button */}
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          "w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all duration-200",
          "bg-gradient-to-r from-amber to-amber2 text-dark",
          "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
          "hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5",
          "active:translate-y-0",
          "disabled:opacity-60 disabled:pointer-events-none"
        )}
      >
        {submitting ? "Sending..." : isBookable ? "Reserve" : "Contact host"}
      </button>

      <p className="text-center text-[13px] text-text3">
        You won&apos;t be charged yet
      </p>

      {/* Price breakdown */}
      {isBookable && form.checkIn && form.checkOut && (
        <div className="border-t border-border pt-4 mt-4 space-y-2.5">
          <div className="flex justify-between text-[14px]">
            <span className="text-text2 underline decoration-dashed underline-offset-2">
              KSh {price.toLocaleString()} x{" "}
              {Math.max(
                1,
                Math.ceil(
                  (new Date(form.checkOut).getTime() -
                    new Date(form.checkIn).getTime()) /
                    86400000
                )
              )}{" "}
              nights
            </span>
            <span className="font-semibold text-text">
              KSh{" "}
              {(
                price *
                Math.max(
                  1,
                  Math.ceil(
                    (new Date(form.checkOut).getTime() -
                      new Date(form.checkIn).getTime()) /
                      86400000
                  )
                )
              ).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-text2 underline decoration-dashed underline-offset-2">
              Service fee
            </span>
            <span className="font-semibold text-text">
              KSh{" "}
              {Math.round(
                price *
                  Math.max(
                    1,
                    Math.ceil(
                      (new Date(form.checkOut).getTime() -
                        new Date(form.checkIn).getTime()) /
                        86400000
                    )
                  ) *
                  0.1
              ).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-[15px] font-bold pt-2.5 border-t border-border">
            <span>Total</span>
            <span>
              KSh{" "}
              {Math.round(
                price *
                  Math.max(
                    1,
                    Math.ceil(
                      (new Date(form.checkOut).getTime() -
                        new Date(form.checkIn).getTime()) /
                        86400000
                    )
                  ) *
                  1.1
              ).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </form>
  );
}

export { ContactForm };
