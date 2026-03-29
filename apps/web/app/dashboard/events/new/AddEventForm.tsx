"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Constants ──────────────────────────────────────── */

const SUBCATEGORIES = [
  { value: "parties", label: "Parties" },
  { value: "festival", label: "Festival" },
  { value: "art_culture", label: "Art & Culture" },
  { value: "wellness_sport", label: "Wellness & Sport" },
  { value: "networking", label: "Networking" },
  { value: "kids", label: "Kids" },
  { value: "other", label: "Other" },
];

const CITIES = ["Watamu", "Kilifi", "Diani", "Nairobi", "Lamu"];

const AGE_OPTIONS = [
  { value: "all-ages", label: "All Ages" },
  { value: "18+", label: "18+" },
  { value: "21+", label: "21+" },
];

const STEPS = [
  { key: "basic", label: "Basic info" },
  { key: "datetime", label: "Date & venue" },
  { key: "tickets", label: "Tickets" },
  { key: "review", label: "Review" },
] as const;
type Step = (typeof STEPS)[number]["key"];

/* ── Styles ─────────────────────────────────────────── */

const inputCls =
  "w-full rounded-xl border border-[#E2DDD5] bg-white px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all";
const labelCls = "block text-[14px] font-bold text-[#16130C] mb-1.5";
const selectCls = cn(inputCls, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239C9485%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10");

/* ── Ticket type ────────────────────────────────────── */

interface TicketRow {
  name: string;
  price: string;
  description: string;
  available: string;
}

const emptyTicket = (): TicketRow => ({
  name: "",
  price: "",
  description: "",
  available: "",
});

interface ScheduleRow {
  day: string;
  startTime: string;
  endTime: string;
}

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const emptySchedule = (): ScheduleRow => ({
  day: "",
  startTime: "",
  endTime: "",
});

/* ── Progress Dots ──────────────────────────────────── */

function ProgressDots({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center">
          {i > 0 && (
            <div
              className={cn(
                "w-8 h-[2px] mx-1",
                i <= currentIndex ? "bg-[#E8A020]" : "bg-[#E2DDD5]"
              )}
            />
          )}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "size-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all",
                i < currentIndex
                  ? "bg-[#E8A020] text-white"
                  : i === currentIndex
                    ? "border-2 border-[#E8A020] text-[#E8A020] bg-white"
                    : "border-2 border-[#E2DDD5] text-[#9C9485] bg-white"
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "text-[10px] font-semibold whitespace-nowrap",
                i <= currentIndex ? "text-[#E8A020]" : "text-[#9C9485]"
              )}
            >
              {s.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Form Component ─────────────────────────────────── */

interface AddEventFormProps {
  hostDisplayName: string;
  sanityHostId: string | null;
}

export function AddEventForm({ hostDisplayName, sanityHostId }: AddEventFormProps) {
  const router = useRouter();

  // Step
  const [step, setStep] = useState<Step>("basic");
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // Step 1 — Basic info
  const [title, setTitle] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [city, setCity] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — Date & venue
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [doorsOpen, setDoorsOpen] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState("");
  const [schedule, setSchedule] = useState<ScheduleRow[]>([emptySchedule()]);

  // Step 3 — Tickets
  const [isFree, setIsFree] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([emptyTicket()]);
  const [ticketLink, setTicketLink] = useState("");
  const [ageRestriction, setAgeRestriction] = useState("all-ages");
  const [totalCapacity, setTotalCapacity] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string; city: string; isLive: boolean } | null>(null);

  /* ── Photo handlers ───────────────────── */

  function handleCoverPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPhoto(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleAdditionalPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - additionalPhotos.length;
    const toAdd = files.slice(0, remaining);
    setAdditionalPhotos((prev) => [...prev, ...toAdd]);
    setAdditionalPreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
  }

  function removeAdditionalPhoto(idx: number) {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx));
    setAdditionalPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ── Ticket handlers ──────────────────── */

  function updateTicket(idx: number, field: keyof TicketRow, value: string) {
    setTickets((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  }

  function addTicket() {
    if (tickets.length < 5) setTickets((prev) => [...prev, emptyTicket()]);
  }

  function removeTicket(idx: number) {
    setTickets((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ── Schedule handlers ────────────────── */

  function updateSchedule(idx: number, field: keyof ScheduleRow, value: string) {
    setSchedule((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  }

  function addScheduleRow() {
    if (schedule.length < 7) setSchedule((prev) => [...prev, emptySchedule()]);
  }

  function removeScheduleRow(idx: number) {
    setSchedule((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ── Validation ───────────────────────── */

  const step1Valid = title.trim() !== "" && subcategory !== "" && city !== "" && shortDescription.trim() !== "" && coverPhoto !== null;
  const step2Valid = (isRecurring ? schedule.some((s) => s.day && s.startTime) : startDate !== "") && venueName.trim() !== "";
  const step3Valid = true; // all optional beyond free toggle

  /* ── Submit ───────────────────────────── */

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("subcategory", subcategory);
      formData.set("city", city);
      formData.set("shortDescription", shortDescription);
      formData.set("fullDescription", fullDescription);
      formData.set("startDate", startDate);
      formData.set("endDate", endDate);
      formData.set("doorsOpen", doorsOpen);
      formData.set("venueName", venueName);
      formData.set("venueAddress", venueAddress);
      formData.set("isRecurring", String(isRecurring));
      formData.set("recurrenceRule", recurrenceRule);
      if (isRecurring) {
        formData.set("schedule", JSON.stringify(schedule.filter((s) => s.day && s.startTime)));
      }
      formData.set("isFree", String(isFree));
      formData.set("ticketLink", ticketLink);
      formData.set("ageRestriction", ageRestriction);
      formData.set("totalCapacity", totalCapacity);
      formData.set("hostDisplayName", hostDisplayName);
      formData.set("sanityHostId", sanityHostId ?? "");

      if (!isFree) {
        formData.set("tickets", JSON.stringify(tickets.filter((t) => t.name.trim())));
      }

      if (coverPhoto) formData.set("coverPhoto", coverPhoto);
      additionalPhotos.forEach((f, i) => formData.set(`photo_${i}`, f));
      formData.set("additionalPhotoCount", String(additionalPhotos.length));

      const res = await fetch("/api/dashboard/events/create", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create event");

      setSuccess({ slug: data.slug, city: data.city, isLive: data.isLive });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success screen ───────────────────── */

  if (success) {
    const citySlug = success.city.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="max-w-[520px] mx-auto text-center py-12">
        <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <svg className="size-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-[24px] font-bold text-text mb-3">
          {success.isLive ? "Your event is live!" : "Event submitted for review"}
        </h2>
        <p className="text-text2 text-[15px] mb-8">
          {success.isLive
            ? "Your event is now visible on Klickenya. Share it with your audience!"
            : "Our team will review your event within 24 hours. We'll email you once it's approved."}
        </p>
        {success.isLive && (
          <button
            onClick={() => router.push(`/events/${citySlug}/${success.slug}`)}
            className="px-6 py-3 rounded-full bg-[#E8A020] text-white font-semibold text-[14px] hover:bg-[#d4911c] transition-colors"
          >
            View your event
          </button>
        )}
        <button
          onClick={() => router.push("/dashboard/events")}
          className="block mx-auto mt-4 text-[14px] font-medium text-text2 hover:text-text transition-colors"
        >
          Back to My Events
        </button>
      </div>
    );
  }

  /* ── Render ───────────────────────────── */

  return (
    <div className="max-w-[640px]">
      <ProgressDots currentIndex={stepIndex} />

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {/* ═══ STEP 1: Basic info ═══ */}
      {step === "basic" && (
        <div className="space-y-5">
          <div>
            <label className={labelCls}>Event title *</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Papa Remo Beach Party" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category *</label>
              <select className={selectCls} value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                <option value="">Select…</option>
                {SUBCATEGORIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>City *</label>
              <select className={selectCls} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Select…</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Short description *</label>
            <textarea
              className={cn(inputCls, "resize-none")}
              rows={3}
              maxLength={300}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="One-liner about your event (shown on cards)"
            />
            <p className="text-[11px] text-text3 mt-1">{shortDescription.length}/300</p>
          </div>

          <div>
            <label className={labelCls}>Full description</label>
            <textarea
              className={cn(inputCls, "resize-none")}
              rows={6}
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              placeholder="Tell people more about the event, what to expect, etc."
            />
          </div>

          {/* Cover photo */}
          <div>
            <label className={labelCls}>Cover photo *</label>
            {coverPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-[#E2DDD5]">
                <Image src={coverPreview} alt="Cover preview" width={640} height={360} className="w-full h-[200px] object-cover" />
                <button
                  onClick={() => { setCoverPhoto(null); setCoverPreview(null); }}
                  className="absolute top-2 right-2 size-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                className="w-full h-[160px] rounded-xl border-2 border-dashed border-[#E2DDD5] bg-surface/50 flex flex-col items-center justify-center gap-2 text-text3 hover:border-[#E8A020] hover:text-[#E8A020] transition-colors"
              >
                <Upload className="size-6" />
                <span className="text-[13px] font-medium">Upload cover image</span>
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverPhoto} />
          </div>

          {/* Additional photos */}
          <div>
            <label className={labelCls}>Additional photos <span className="font-normal text-text3">(up to 5)</span></label>
            <div className="flex gap-3 flex-wrap">
              {additionalPreviews.map((src, i) => (
                <div key={i} className="relative size-20 rounded-lg overflow-hidden border border-[#E2DDD5]">
                  <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" />
                  <button
                    onClick={() => removeAdditionalPhoto(i)}
                    className="absolute top-0.5 right-0.5 size-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
              {additionalPhotos.length < 5 && (
                <button
                  onClick={() => additionalInputRef.current?.click()}
                  className="size-20 rounded-lg border-2 border-dashed border-[#E2DDD5] flex items-center justify-center text-text3 hover:border-[#E8A020] hover:text-[#E8A020] transition-colors"
                >
                  <Plus className="size-5" />
                </button>
              )}
            </div>
            <input ref={additionalInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleAdditionalPhotos} />
          </div>

          <button
            disabled={!step1Valid}
            onClick={() => setStep("datetime")}
            className="w-full py-3 rounded-xl bg-[#E8A020] text-white font-semibold text-[14px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#d4911c] transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* ═══ STEP 2: Date & venue ═══ */}
      {step === "datetime" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start date & time *</label>
              <input type="datetime-local" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>End date & time</label>
              <input type="datetime-local" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Doors open</label>
            <input type="time" className={inputCls} value={doorsOpen} onChange={(e) => setDoorsOpen(e.target.value)} placeholder="18:00" />
          </div>

          <div>
            <label className={labelCls}>Venue name *</label>
            <input className={inputCls} value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="e.g. Papa Remo Beach Club" />
          </div>

          <div>
            <label className={labelCls}>Venue address</label>
            <input className={inputCls} value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} placeholder="Full address" />
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRecurring(!isRecurring)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                isRecurring ? "bg-[#E8A020]" : "bg-[#E2DDD5]"
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform shadow-sm",
                isRecurring && "translate-x-5"
              )} />
            </button>
            <span className="text-[14px] font-medium text-text">This is a recurring event</span>
          </div>

          {isRecurring && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Recurrence label</label>
                <input className={inputCls} value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)} placeholder="e.g. Every Friday, Every week" />
                <p className="text-[11px] text-text3 mt-1">Short label shown on the event page</p>
              </div>

              <div>
                <label className={labelCls}>Weekly schedule</label>
                <p className="text-[11px] text-text3 mb-3">Add the days and times this event runs</p>
                <div className="space-y-3">
                  {schedule.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select className={cn(selectCls, "flex-1")} value={row.day} onChange={(e) => updateSchedule(i, "day", e.target.value)}>
                        <option value="">Day…</option>
                        {DAYS_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                      <input type="time" className={cn(inputCls, "w-28")} value={row.startTime} onChange={(e) => updateSchedule(i, "startTime", e.target.value)} placeholder="Start" />
                      <input type="time" className={cn(inputCls, "w-28")} value={row.endTime} onChange={(e) => updateSchedule(i, "endTime", e.target.value)} placeholder="End" />
                      {schedule.length > 1 && (
                        <button onClick={() => removeScheduleRow(i)} className="text-red-500 hover:text-red-700 transition-colors shrink-0">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {schedule.length < 7 && (
                  <button onClick={addScheduleRow} className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#E8A020] hover:text-[#d4911c] transition-colors">
                    <Plus className="size-4" /> Add another day
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep("basic")} className="flex-1 py-3 rounded-xl border border-[#E2DDD5] text-text font-semibold text-[14px] hover:bg-surface transition-colors">
              Back
            </button>
            <button
              disabled={!step2Valid}
              onClick={() => setStep("tickets")}
              className="flex-1 py-3 rounded-xl bg-[#E8A020] text-white font-semibold text-[14px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#d4911c] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Tickets ═══ */}
      {step === "tickets" && (
        <div className="space-y-5">
          {/* Free toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFree(!isFree)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                isFree ? "bg-[#E8A020]" : "bg-[#E2DDD5]"
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform shadow-sm",
                isFree && "translate-x-5"
              )} />
            </button>
            <span className="text-[14px] font-medium text-text">This event is free</span>
          </div>

          {!isFree && (
            <>
              <div>
                <label className={labelCls}>Ticket types</label>
                <div className="space-y-3">
                  {tickets.map((ticket, i) => (
                    <div key={i} className="rounded-xl border border-[#E2DDD5] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-text">Ticket {i + 1}</span>
                        {tickets.length > 1 && (
                          <button onClick={() => removeTicket(i)} className="text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input className={inputCls} placeholder="Ticket name *" value={ticket.name} onChange={(e) => updateTicket(i, "name", e.target.value)} />
                        <input className={inputCls} type="number" placeholder="Price (KES) *" value={ticket.price} onChange={(e) => updateTicket(i, "price", e.target.value)} />
                      </div>
                      <input className={inputCls} placeholder="Description (optional)" value={ticket.description} onChange={(e) => updateTicket(i, "description", e.target.value)} />
                      <input className={inputCls} type="number" placeholder="Available quantity" value={ticket.available} onChange={(e) => updateTicket(i, "available", e.target.value)} />
                    </div>
                  ))}
                </div>
                {tickets.length < 5 && (
                  <button onClick={addTicket} className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#E8A020] hover:text-[#d4911c] transition-colors">
                    <Plus className="size-4" /> Add another ticket type
                  </button>
                )}
              </div>

              <div>
                <label className={labelCls}>External ticket link <span className="font-normal text-text3">(optional)</span></label>
                <input className={inputCls} type="url" value={ticketLink} onChange={(e) => setTicketLink(e.target.value)} placeholder="e.g. https://eventbrite.com/..." />
                <p className="text-[11px] text-text3 mt-1">If you sell tickets on Eventbrite, Ticket Sasa etc.</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Age restriction</label>
              <select className={selectCls} value={ageRestriction} onChange={(e) => setAgeRestriction(e.target.value)}>
                {AGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Total capacity</label>
              <input className={inputCls} type="number" value={totalCapacity} onChange={(e) => setTotalCapacity(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("datetime")} className="flex-1 py-3 rounded-xl border border-[#E2DDD5] text-text font-semibold text-[14px] hover:bg-surface transition-colors">
              Back
            </button>
            <button
              disabled={!step3Valid}
              onClick={() => setStep("review")}
              className="flex-1 py-3 rounded-xl bg-[#E8A020] text-white font-semibold text-[14px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#d4911c] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 4: Review & submit ═══ */}
      {step === "review" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="rounded-xl border border-[#E2DDD5] divide-y divide-[#E2DDD5]">
            <SummaryRow label="Title" value={title} />
            <SummaryRow label="Category" value={SUBCATEGORIES.find((s) => s.value === subcategory)?.label ?? subcategory} />
            <SummaryRow label="City" value={city} />
            <SummaryRow label="Description" value={shortDescription} />
            <SummaryRow label="Start" value={startDate ? new Date(startDate).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"} />
            {endDate && <SummaryRow label="End" value={new Date(endDate).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} />}
            <SummaryRow label="Venue" value={venueName} />
            {venueAddress && <SummaryRow label="Address" value={venueAddress} />}
            {doorsOpen && <SummaryRow label="Doors open" value={doorsOpen} />}
            {isRecurring && <SummaryRow label="Recurring" value={recurrenceRule || "Yes"} />}
            <SummaryRow label="Price" value={isFree ? "Free" : tickets.filter((t) => t.name).map((t) => `${t.name}: KES ${t.price}`).join(", ") || "—"} />
            <SummaryRow label="Age" value={AGE_OPTIONS.find((o) => o.value === ageRestriction)?.label ?? ageRestriction} />
            {coverPreview && (
              <div className="p-4">
                <span className="text-[12px] font-semibold text-text3 uppercase tracking-wide">Cover photo</span>
                <Image src={coverPreview} alt="Cover" width={200} height={120} className="mt-2 rounded-lg object-cover" />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("tickets")} className="flex-1 py-3 rounded-xl border border-[#E2DDD5] text-text font-semibold text-[14px] hover:bg-surface transition-colors">
              Back
            </button>
            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-xl bg-[#E8A020] text-white font-semibold text-[14px] disabled:opacity-60 hover:bg-[#d4911c] transition-colors flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Submitting…" : "Submit event"}
            </button>
          </div>

          <p className="text-[12px] text-text3 text-center">
            Your event will be reviewed by our team. Returning hosts with approved events get instant publishing.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Summary row ────────────────────────── */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 p-4">
      <span className="text-[12px] font-semibold text-text3 uppercase tracking-wide w-24 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-[14px] text-text">{value}</span>
    </div>
  );
}
