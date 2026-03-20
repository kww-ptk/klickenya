"use client";

import { useState, useMemo, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import PhoneInput from "@/components/ui/PhoneInput";

/* ─── Types ──────────────────────────────────────── */

type ListingType = "stay" | "experience" | "event" | "rental" | "service" | "restaurant";

interface ContactFormProps {
  listingId: string;
  listingTitle: string;
  listingType: string;
  price: number;
  priceUnit: string;
  maxGuests?: number;
  ticketTypes?: string[];
}

interface FormFields {
  name: string;
  email: string;
  phone: string;
  message: string;
  // Stay
  checkIn: string;
  checkOut: string;
  guests: number;
  // Experience
  preferredDate: string;
  groupSize: number;
  experienceLevel: string;
  // Event
  ticketQuantity: number;
  ticketType: string;
  promoCode: string;
  // Rental
  pickupDate: string;
  returnDate: string;
  licenceNumber: string;
  // Service
  serviceDate: string;
  serviceTime: string;
  duration: string;
  // Restaurant
  reservationDate: string;
  reservationTime: string;
  diners: number;
}

type Status = "idle" | "loading" | "success" | "error";

/* ─── Helpers ────────────────────────────────────── */

const today = () => new Date().toISOString().split("T")[0];

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

const inputCls =
  "w-full border border-border rounded-[14px] px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors bg-white";

const labelCls = "block text-[10.5px] font-bold text-text2 uppercase tracking-wide mb-0.5";

/* ─── Counter ────────────────────────────────────── */

function Counter({
  label,
  value,
  min = 1,
  max = 50,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between border border-border rounded-[14px] p-3">
      <div>
        <span className={labelCls}>{label}</span>
        <span className="text-[14px] text-text">
          {value} {suffix ?? label.toLowerCase()}
          {value !== 1 && !suffix ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="size-8 rounded-full border border-border flex items-center justify-center text-[18px] text-text2 hover:border-dark transition-colors"
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          &minus;
        </button>
        <span className="text-[15px] font-semibold w-5 text-center">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="size-8 rounded-full border border-border flex items-center justify-center text-[18px] text-text2 hover:border-dark transition-colors"
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────── */

function ContactForm({
  listingId,
  listingTitle,
  listingType,
  price,
  priceUnit,
  maxGuests = 20,
  ticketTypes,
}: ContactFormProps) {
  const type = listingType as ListingType;

  const [form, setForm] = useState<FormFields>({
    name: "",
    email: "",
    phone: "",
    message: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
    preferredDate: "",
    groupSize: 1,
    experienceLevel: "Beginner",
    ticketQuantity: 1,
    ticketType: ticketTypes?.[0] ?? "General",
    promoCode: "",
    pickupDate: "",
    returnDate: "",
    licenceNumber: "",
    serviceDate: "",
    serviceTime: "",
    duration: "1h",
    reservationDate: "",
    reservationTime: "",
    diners: 2,
  });

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* Price breakdown for stays */
  const nights = useMemo(
    () => (type === "stay" ? nightsBetween(form.checkIn, form.checkOut) : 0),
    [type, form.checkIn, form.checkOut]
  );
  const subtotal = price * nights;

  /* Build payload per type */
  function buildPayload(): Record<string, unknown> {
    const base = {
      listingId,
      listingTitle,
      listingType: type,
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: form.message || undefined,
    };

    switch (type) {
      case "stay":
        return { ...base, checkIn: form.checkIn, checkOut: form.checkOut, guests: form.guests };
      case "experience":
        return {
          ...base,
          preferredDate: form.preferredDate,
          groupSize: form.groupSize,
          experienceLevel: form.experienceLevel,
        };
      case "event":
        return {
          ...base,
          ticketQuantity: form.ticketQuantity,
          ticketType: form.ticketType,
          promoCode: form.promoCode || undefined,
        };
      case "rental":
        return {
          ...base,
          pickupDate: form.pickupDate,
          returnDate: form.returnDate,
          licenceNumber: form.licenceNumber,
        };
      case "service":
        return {
          ...base,
          preferredDate: form.serviceDate,
          preferredTime: form.serviceTime,
          duration: form.duration,
        };
      case "restaurant":
        return {
          ...base,
          reservationDate: form.reservationDate,
          reservationTime: form.reservationTime,
          diners: form.diners,
        };
      default:
        return base;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send enquiry");
      }

      setStatus("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  /* ─── Success state ──────────────────────────── */
  if (status === "success") {
    return (
      <div className="text-center py-8">
        <div className="size-14 rounded-full bg-[#22C55E]/15 flex items-center justify-center mx-auto mb-4">
          <svg className="size-7 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4 className="font-display text-[18px] font-bold text-text mb-1.5">Enquiry sent!</h4>
        <p className="text-[14px] text-text2 leading-[1.6] max-w-[240px] mx-auto">
          We&apos;ll get back to you within 2 hours. Check your email for confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ─── Heading ─────────────────────────────── */}
      <h3 className="font-display text-[18px] font-bold text-text tracking-[-0.02em]">
        Enquire about this listing
      </h3>

      {/* ─── Price display ───────────────────────── */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="font-display text-[26px] font-extrabold tracking-[-0.02em] text-dark">
          KSh {price.toLocaleString()}
        </span>
        <span className="text-[15px] text-text2">/ {priceUnit}</span>
      </div>

      {/* ─── Stay fields ─────────────────────────── */}
      {type === "stay" && (
        <>
          <div className="grid grid-cols-2 border border-border rounded-[14px] overflow-hidden">
            <div className="p-3 border-r border-border">
              <label className={labelCls}>Check-in</label>
              <input
                type="date"
                value={form.checkIn}
                min={today()}
                onChange={(e) => update("checkIn", e.target.value)}
                className="w-full text-[14px] text-text bg-transparent outline-none"
                required
              />
            </div>
            <div className="p-3">
              <label className={labelCls}>Check-out</label>
              <input
                type="date"
                value={form.checkOut}
                min={form.checkIn || today()}
                onChange={(e) => update("checkOut", e.target.value)}
                className="w-full text-[14px] text-text bg-transparent outline-none"
                required
              />
            </div>
          </div>
          <Counter label="Guest" value={form.guests} max={maxGuests} onChange={(v) => update("guests", v)} suffix="guest" />
        </>
      )}

      {/* ─── Experience fields ───────────────────── */}
      {type === "experience" && (
        <>
          <div className="border border-border rounded-[14px] p-3">
            <label className={labelCls}>Preferred date</label>
            <input
              type="date"
              value={form.preferredDate}
              min={today()}
              onChange={(e) => update("preferredDate", e.target.value)}
              className="w-full text-[14px] text-text bg-transparent outline-none"
              required
            />
          </div>
          <Counter label="Group size" value={form.groupSize} onChange={(v) => update("groupSize", v)} suffix="people" />
          <div className="border border-border rounded-[14px] p-3">
            <label className={labelCls}>Experience level</label>
            <select
              value={form.experienceLevel}
              onChange={(e) => update("experienceLevel", e.target.value)}
              className="w-full text-[14px] text-text bg-transparent outline-none"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Experienced</option>
            </select>
          </div>
        </>
      )}

      {/* ─── Event fields ────────────────────────── */}
      {type === "event" && (
        <>
          <Counter label="Ticket" value={form.ticketQuantity} max={20} onChange={(v) => update("ticketQuantity", v)} suffix="ticket" />
          <div className="border border-border rounded-[14px] p-3">
            <label className={labelCls}>Ticket type</label>
            <select
              value={form.ticketType}
              onChange={(e) => update("ticketType", e.target.value)}
              className="w-full text-[14px] text-text bg-transparent outline-none"
            >
              {(ticketTypes?.length ? ticketTypes : ["General"]).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Promo code"
              value={form.promoCode}
              onChange={(e) => update("promoCode", e.target.value)}
              className={cn(inputCls, "flex-1")}
            />
            <button
              type="button"
              className="px-4 py-3 rounded-[14px] border border-border text-[13px] font-semibold text-text2 hover:border-amber hover:text-amber transition-colors"
            >
              Apply
            </button>
          </div>
        </>
      )}

      {/* ─── Rental fields ───────────────────────── */}
      {type === "rental" && (
        <>
          <div className="grid grid-cols-2 border border-border rounded-[14px] overflow-hidden">
            <div className="p-3 border-r border-border">
              <label className={labelCls}>Pickup date</label>
              <input
                type="date"
                value={form.pickupDate}
                min={today()}
                onChange={(e) => update("pickupDate", e.target.value)}
                className="w-full text-[14px] text-text bg-transparent outline-none"
                required
              />
            </div>
            <div className="p-3">
              <label className={labelCls}>Return date</label>
              <input
                type="date"
                value={form.returnDate}
                min={form.pickupDate || today()}
                onChange={(e) => update("returnDate", e.target.value)}
                className="w-full text-[14px] text-text bg-transparent outline-none"
                required
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Driver's licence number"
            value={form.licenceNumber}
            onChange={(e) => update("licenceNumber", e.target.value)}
            className={inputCls}
            required
          />
        </>
      )}

      {/* ─── Service fields ──────────────────────── */}
      {type === "service" && (
        <>
          <div className="grid grid-cols-2 border border-border rounded-[14px] overflow-hidden">
            <div className="p-3 border-r border-border">
              <label className={labelCls}>Preferred date</label>
              <input
                type="date"
                value={form.serviceDate}
                min={today()}
                onChange={(e) => update("serviceDate", e.target.value)}
                className="w-full text-[14px] text-text bg-transparent outline-none"
                required
              />
            </div>
            <div className="p-3">
              <label className={labelCls}>Preferred time</label>
              <input
                type="time"
                value={form.serviceTime}
                onChange={(e) => update("serviceTime", e.target.value)}
                className="w-full text-[14px] text-text bg-transparent outline-none"
                required
              />
            </div>
          </div>
          <div className="border border-border rounded-[14px] p-3">
            <label className={labelCls}>Duration</label>
            <select
              value={form.duration}
              onChange={(e) => update("duration", e.target.value)}
              className="w-full text-[14px] text-text bg-transparent outline-none"
            >
              <option value="1h">1 hour</option>
              <option value="2h">2 hours</option>
              <option value="3h">3 hours</option>
              <option value="Half day">Half day</option>
              <option value="Full day">Full day</option>
            </select>
          </div>
        </>
      )}

      {/* ─── Restaurant fields ───────────────────── */}
      {type === "restaurant" && (
        <>
          <div className="grid grid-cols-2 border border-border rounded-[14px] overflow-hidden">
            <div className="p-3 border-r border-border">
              <label className={labelCls}>Reservation date</label>
              <input
                type="date"
                value={form.reservationDate}
                min={today()}
                onChange={(e) => update("reservationDate", e.target.value)}
                className="w-full text-[14px] text-text bg-transparent outline-none"
                required
              />
            </div>
            <div className="p-3">
              <label className={labelCls}>Reservation time</label>
              <input
                type="time"
                value={form.reservationTime}
                onChange={(e) => update("reservationTime", e.target.value)}
                className="w-full text-[14px] text-text bg-transparent outline-none"
                required
              />
            </div>
          </div>
          <Counter label="Diner" value={form.diners} max={30} onChange={(v) => update("diners", v)} suffix="diner" />
        </>
      )}

      {/* ─── Shared contact fields ───────────────── */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
          className={inputCls}
        />
        <input
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
          className={inputCls}
        />
        <PhoneInput
          value={form.phone}
          onChange={(val) => update("phone", val)}
          required
          className={inputCls}
          inputClassName="!border-l-0 !rounded-l-none"
        />
        <textarea
          placeholder={type === "restaurant" ? "Special requests / dietary requirements (optional)" : "Message / special requests (optional)"}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          rows={3}
          className={cn(inputCls, "resize-none")}
        />
      </div>

      {/* ─── Submit button ───────────────────────── */}
      <button
        type="submit"
        disabled={status === "loading"}
        className={cn(
          "w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all duration-200",
          "bg-gradient-to-r from-amber to-amber2 text-dark",
          "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
          "hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5",
          "active:translate-y-0",
          "disabled:opacity-60 disabled:pointer-events-none"
        )}
      >
        {status === "loading" ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </span>
        ) : (
          "Send enquiry"
        )}
      </button>

      {/* ─── Error message ───────────────────────── */}
      {status === "error" && error && (
        <p className="text-[13px] text-[#DC2626] text-center">{error}</p>
      )}

      {/* ─── Trust signals ───────────────────────── */}
      <div className="flex items-center justify-center gap-3 text-[12px] text-text3">
        <span>&#128274; Secure</span>
        <span className="text-border">&#183;</span>
        <span>&#128241; Reply within 2hrs</span>
        <span className="text-border">&#183;</span>
        <span>&#10003; Free</span>
      </div>

      {/* ─── Price breakdown (stays) ─────────────── */}
      {type === "stay" && form.checkIn && form.checkOut && nights > 0 && (
        <div className="border-t border-border pt-4 mt-4 space-y-2.5">
          <div className="flex justify-between text-[14px]">
            <span className="text-text2 underline decoration-dashed underline-offset-2">
              KSh {price.toLocaleString()} &times; {nights} night{nights !== 1 ? "s" : ""}
            </span>
            <span className="font-semibold text-text">
              KSh {subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-text2 underline decoration-dashed underline-offset-2">
              Service fee
            </span>
            <span className="text-text2 text-[13px] italic">
              Discussed with host
            </span>
          </div>
          <div className="flex justify-between text-[15px] font-bold pt-2.5 border-t border-border">
            <span>Subtotal</span>
            <span>KSh {subtotal.toLocaleString()}</span>
          </div>
        </div>
      )}
    </form>
  );
}

export { ContactForm };
export type { ContactFormProps };
