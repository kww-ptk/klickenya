"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ---------- Types ---------- */

interface ClaimFormProps {
  listingSlug: string;
  listingSanityId: string;
  listingTitle: string;
  listingType: string;
  listingCity?: string;
}

type Step = "details" | "accuracy" | "otp" | "success";
type PhotoConsent = "yes_all" | "yes_logo_only" | "no";

const INCORRECT_FIELD_OPTIONS = [
  "Business name",
  "Address or location",
  "Phone number",
  "Opening hours",
  "Category or type",
  "Photos are not mine",
  "Description",
  "Pricing",
];

const STEPS: { key: Step; label: string }[] = [
  { key: "details", label: "Your details" },
  { key: "accuracy", label: "Your listing" },
  { key: "otp", label: "Verify email" },
  { key: "success", label: "Done" },
];

/* ---------- Component ---------- */

export function ClaimForm({
  listingSlug,
  listingSanityId,
  listingTitle,
  listingType,
  listingCity,
}: ClaimFormProps) {
  const [step, setStep] = useState<Step>("details");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);

  // Step 1 — Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);

  // Step 2 — Accuracy
  const [everythingCorrect, setEverythingCorrect] = useState<boolean | null>(null);
  const [incorrectFields, setIncorrectFields] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [socialMediaUrl, setSocialMediaUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [photoConsent, setPhotoConsent] = useState<PhotoConsent | null>(null);
  const [extraNotes, setExtraNotes] = useState("");

  // Step 3 — OTP
  const [otpValue, setOtpValue] = useState("");
  const [resendCountdown, setResendCountdown] = useState(30);
  const otpRef = useRef<HTMLInputElement>(null);

  const CONSENT_TEXT = `By claiming this listing you confirm:

1. Ownership — You are the owner or authorised representative of ${listingTitle} and have the right to manage this listing.

2. Accuracy — You take responsibility for keeping listing information accurate. Klickenya is not responsible for errors in listing content.

3. Marketing — You authorise Klickenya to use your listing name, description, and approved photos for marketing including social media and email campaigns.

4. Terms — You agree to Klickenya's Terms of Service and Privacy Policy.

5. Disclaimer — Klickenya acts as a marketplace only and is not responsible for transactions or disputes between guests and businesses.`;

  /* ── OTP countdown ── */
  useEffect(() => {
    if (step !== "otp") return;
    setResendCountdown(30);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, claimId]);

  /* ── Auto-focus OTP input ── */
  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  /* ── Progress indicator ── */
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function ProgressDots() {
    return (
      <div className="flex items-center justify-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-200",
                  i < stepIndex
                    ? "bg-[#E8A020]"
                    : i === stepIndex
                      ? "border-2 border-[#E8A020] bg-transparent"
                      : "bg-[#E2DDD5]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] mt-1.5 whitespace-nowrap",
                  i <= stepIndex ? "text-[#16130C] font-semibold" : "text-[#9C9485]"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-12 h-px mx-1 -mt-4",
                  i < stepIndex ? "bg-[#E8A020]" : "bg-[#E2DDD5]"
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  /* ── Submit claim (Step 2 → API) ── */
  async function handleSubmitClaim() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/claim/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimantName: name,
          claimantEmail: email,
          claimantPhone: phone,
          listingSlug,
          listingSanityId,
          listingTitle,
          listingType,
          listingCity,
          everythingCorrect,
          incorrectFields: incorrectFields.length > 0 ? incorrectFields : undefined,
          additionalNotes: (additionalNotes || extraNotes) ? [additionalNotes, extraNotes].filter(Boolean).join("\n\n") : undefined,
          socialMediaUrl: socialMediaUrl || undefined,
          websiteUrl: websiteUrl || undefined,
          photoConsent: photoConsent ?? undefined,
          consentGiven: true,
          consentTimestamp: consentTimestamp!,
          consentText: CONSENT_TEXT,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      setClaimId(json.claimId);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Verify OTP (Step 3 → API) ── */
  async function handleVerifyOtp() {
    if (otpValue.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/claim/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, otpCode: otpValue }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Verification failed");
      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setOtpValue("");
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Resend OTP ── */
  async function handleResend() {
    setResendCountdown(30);
    setError(null);
    try {
      const res = await fetch("/api/claim/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimantName: name,
          claimantEmail: email,
          claimantPhone: phone,
          listingSlug,
          listingSanityId,
          listingTitle,
          listingType,
          listingCity,
          everythingCorrect,
          incorrectFields: incorrectFields.length > 0 ? incorrectFields : undefined,
          additionalNotes: (additionalNotes || extraNotes) ? [additionalNotes, extraNotes].filter(Boolean).join("\n\n") : undefined,
          socialMediaUrl: socialMediaUrl || undefined,
          websiteUrl: websiteUrl || undefined,
          photoConsent: photoConsent ?? undefined,
          consentGiven: true,
          consentTimestamp: consentTimestamp!,
          consentText: CONSENT_TEXT,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to resend");
      setClaimId(json.claimId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  }

  /* ── Input classes ── */
  const inputCls = "w-full border border-[#E2DDD5] rounded-xl px-4 py-3 text-[15px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 transition-colors bg-white";
  const labelCls = "block text-sm font-semibold text-[#16130C] mb-1.5";

  /* ══════════════════════════════════════ */
  /* STEP 1 — Details                      */
  /* ══════════════════════════════════════ */
  if (step === "details") {
    const detailsValid = name.length >= 2 && email.includes("@") && phone.length >= 9;

    return (
      <div>
        <ProgressDots />

        <div className="space-y-4 mb-6">
          <div>
            <label className={labelCls}>Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 700 000 000"
              className={inputCls}
              required
            />
          </div>
          <p className="text-xs text-[#9C9485]">
            We&apos;ll send a 6-digit code to your email to verify your identity.
          </p>
        </div>

        {/* Consent box */}
        <div className="border border-[#E2DDD5] rounded-xl p-4 mb-4 bg-[#F4F1EC]">
          <p className="text-sm font-bold text-[#16130C] mb-2">Before you continue</p>
          <div className="max-h-28 overflow-y-auto text-xs text-[#5E5848] leading-relaxed mb-3 whitespace-pre-line">
            {CONSENT_TEXT}
          </div>
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => {
                  setConsentGiven(e.target.checked);
                  setConsentTimestamp(e.target.checked ? new Date().toISOString() : null);
                }}
                className="sr-only"
              />
              <div
                className={cn(
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                  consentGiven
                    ? "bg-[#E8A020] border-[#E8A020]"
                    : "border-[#E2DDD5] bg-white group-hover:border-[#E8A020]/40"
                )}
              >
                {consentGiven && <Check className="size-3 text-white" strokeWidth={3} />}
              </div>
            </div>
            <span className="text-xs text-[#5E5848] leading-relaxed">
              I confirm I have read and agree to the above terms. I am authorised to claim{" "}
              <strong>{listingTitle}</strong> on behalf of this business.
            </span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4">{error}</p>
        )}

        <button
          disabled={!detailsValid || !consentGiven}
          onClick={() => {
            setError(null);
            setStep("accuracy");
          }}
          className={cn(
            "w-full rounded-full py-3 text-sm font-bold transition-all",
            detailsValid && consentGiven
              ? "bg-[#E8A020] text-[#16130C] hover:bg-[#d4911c]"
              : "bg-[#E2DDD5] text-[#9C9485] cursor-not-allowed"
          )}
        >
          {detailsValid && consentGiven ? "Continue →" : "Accept terms to continue"}
        </button>
      </div>
    );
  }

  /* ══════════════════════════════════════ */
  /* STEP 2 — Accuracy                     */
  /* ══════════════════════════════════════ */
  if (step === "accuracy") {
    return (
      <div>
        <ProgressDots />

        <h2 className="font-heading text-xl font-bold text-[#16130C] mb-1">
          Does everything look right?
        </h2>
        <p className="text-sm text-[#5E5848] mb-6">Help us make your listing accurate.</p>

        {/* Q1 — Correct? */}
        <p className="text-sm font-semibold text-[#16130C] mb-3">
          Is the information on your listing correct?
        </p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setEverythingCorrect(true); setIncorrectFields([]); }}
            className={cn(
              "flex-1 rounded-xl py-3 text-sm transition-all",
              everythingCorrect === true
                ? "bg-[#E8A020] text-[#16130C] font-bold"
                : "border border-[#E2DDD5] text-[#5E5848] hover:border-[#E8A020]/40"
            )}
          >
            ✓ Yes, looks good
          </button>
          <button
            onClick={() => setEverythingCorrect(false)}
            className={cn(
              "flex-1 rounded-xl py-3 text-sm transition-all",
              everythingCorrect === false
                ? "bg-[#E8A020] text-[#16130C] font-bold"
                : "border border-[#E2DDD5] text-[#5E5848] hover:border-[#E8A020]/40"
            )}
          >
            ✗ Some things need fixing
          </button>
        </div>

        {everythingCorrect === false && (
          <div className="mb-5">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {INCORRECT_FIELD_OPTIONS.map((field) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative shrink-0">
                    <input
                      type="checkbox"
                      checked={incorrectFields.includes(field)}
                      onChange={(e) => {
                        setIncorrectFields((prev) =>
                          e.target.checked ? [...prev, field] : prev.filter((f) => f !== field)
                        );
                      }}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                        incorrectFields.includes(field)
                          ? "bg-[#E8A020] border-[#E8A020]"
                          : "border-[#E2DDD5] bg-white group-hover:border-[#E8A020]/40"
                      )}
                    >
                      {incorrectFields.includes(field) && <Check className="size-2.5 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <span className="text-xs text-[#5E5848]">{field}</span>
                </label>
              ))}
            </div>
            <div>
              <label className={labelCls}>What needs to change?</label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Our opening hours are Mon–Sat 8am–10pm, closed Sundays."
                rows={3}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Q2 — Online presence */}
        <p className="text-sm font-semibold text-[#16130C] mb-2 mt-5">
          Where can we find you online? <span className="font-normal text-[#9C9485]">(optional)</span>
        </p>
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-[#5E5848] mb-1 block">Website</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-[#5E5848] mb-1 block">Instagram / Facebook / TripAdvisor</label>
            <input
              type="text"
              value={socialMediaUrl}
              onChange={(e) => setSocialMediaUrl(e.target.value)}
              placeholder="@yourhandle or paste URL"
              className={inputCls}
            />
          </div>
        </div>

        {/* Q3 — Photos */}
        <p className="text-sm font-semibold text-[#16130C] mb-3 mt-5">Can we use your photos?</p>
        <div className="space-y-2 mb-5">
          {([
            { value: "yes_all" as const, title: "✓ Yes — use all my photos", desc: "We'll use photos from your website and social media." },
            { value: "yes_logo_only" as const, title: "Logo and key photos only", desc: "Use only your logo and main photo." },
            { value: "no" as const, title: "No — I'll provide my own", desc: `Email photos to hello@klickenya.com with subject: Photos for ${listingTitle}` },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPhotoConsent(opt.value)}
              className={cn(
                "w-full text-left border rounded-xl p-3 flex items-start gap-3 transition-all",
                photoConsent === opt.value
                  ? "border-[#E8A020] bg-[#E8A020]/5"
                  : "border-[#E2DDD5] hover:border-[#E8A020]/40"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#16130C]">{opt.title}</p>
                <p className="text-xs text-[#5E5848] mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Q4 — Extra notes */}
        {!additionalNotes && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-[#16130C] mb-2 mt-5">
              Anything else we should know? <span className="font-normal text-[#9C9485]">(optional)</span>
            </p>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="e.g. We only serve halal food. Closed in April for renovation. Groups over 8 need advance booking."
              rows={3}
              className={inputCls}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep("details")}
            className="px-5 py-3 text-sm text-[#5E5848] hover:text-[#16130C] transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleSubmitClaim}
            disabled={isLoading}
            className="flex-1 bg-[#E8A020] text-[#16130C] font-bold text-sm rounded-full py-3 hover:bg-[#d4911c] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Send verification code →
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════ */
  /* STEP 3 — OTP                          */
  /* ══════════════════════════════════════ */
  if (step === "otp") {
    return (
      <div>
        <ProgressDots />

        <div className="text-center mb-6">
          <p className="text-sm text-[#5E5848]">We sent a 6-digit code to:</p>
          <p className="font-semibold text-[#16130C] mt-1">{email}</p>
        </div>

        <input
          ref={otpRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpValue}
          onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="w-full text-center text-3xl tracking-[0.5em] font-bold text-[#16130C] border-2 border-[#E2DDD5] focus:border-[#E8A020] rounded-xl py-4 outline-none transition-colors bg-white mb-4"
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4">{error}</p>
        )}

        <button
          onClick={handleVerifyOtp}
          disabled={isLoading || otpValue.length !== 6}
          className="w-full bg-[#E8A020] text-[#16130C] font-bold text-sm rounded-full py-3 hover:bg-[#d4911c] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Verify &amp; claim →
        </button>

        <button
          onClick={() => { setStep("details"); setOtpValue(""); setError(null); }}
          className="w-full text-sm text-[#5E5848] underline underline-offset-2 hover:text-[#16130C] mb-4"
        >
          Wrong email? Go back
        </button>

        <div className="text-center">
          {resendCountdown > 0 ? (
            <p className="text-xs text-[#9C9485]">Resend code in {resendCountdown}s</p>
          ) : (
            <button
              onClick={handleResend}
              className="text-xs text-[#E8A020] font-semibold hover:underline"
            >
              Didn&apos;t receive it? Resend code →
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════ */
  /* STEP 4 — Success                      */
  /* ══════════════════════════════════════ */
  const listingUrl = `/${listingType === "experience" ? "experiences" : listingType + "s"}/${(listingCity ?? "").toLowerCase().replace(/ /g, "-")}/${listingSlug}`;

  return (
    <div>
      <ProgressDots />

      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-[#16A34A] flex items-center justify-center mx-auto">
          <Check className="size-8 text-white" strokeWidth={3} />
        </div>
        <h2 className="font-heading text-2xl font-bold text-[#16130C] mt-4 mb-2">
          🎉 {listingTitle} is now claimed!
        </h2>
        <p className="text-sm text-[#5E5848]">
          Our team will review your listing within 24 hours. Once approved, your Verified badge will appear. Check your email for your confirmation.
        </p>
      </div>

      <div className="space-y-2 mb-6">
        <div className="border border-[#E2DDD5] rounded-xl p-4 bg-white">
          <p className="text-sm font-semibold text-[#16130C] mb-1">📸 Add photos</p>
          <p className="text-xs text-[#5E5848]">
            Email photos to hello@klickenya.com with subject: Photos for {listingTitle}
          </p>
        </div>
        <Link
          href={listingUrl}
          target="_blank"
          className="block border border-[#E2DDD5] rounded-xl p-4 bg-white hover:border-[#E8A020]/40 transition-colors"
        >
          <p className="text-sm font-semibold text-[#16130C] mb-1">👁 View your listing</p>
          <p className="text-xs text-[#5E5848]">See how it looks on Klickenya</p>
        </Link>
        <div className="border border-[#E2DDD5] rounded-xl p-4 bg-white">
          <p className="text-sm font-semibold text-[#16130C] mb-1">✉️ Questions?</p>
          <p className="text-xs text-[#5E5848]">
            Reply to your confirmation email or contact hello@klickenya.com
          </p>
        </div>
      </div>

      <p className="text-xs text-[#9C9485] text-center">
        Thank you for joining Klickenya 🇰🇪
      </p>
    </div>
  );
}
