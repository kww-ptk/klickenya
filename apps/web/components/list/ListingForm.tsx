"use client";

import { useState } from "react";
import { SUBCATEGORIES_BY_TYPE, SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";

/* ---------- Types ---------- */

type Step = "type" | "ai" | "details" | "content" | "consent" | "otp" | "success";

type ListingType = "stay" | "experience" | "event" | "service" | "real_estate";

interface FormData {
  // Step 1
  listingType: ListingType | "";
  // Step 2 (AI assist — optional)
  websiteUrl: string;
  googlePlaceId: string;
  // Step 3 — submitter details
  submitterName: string;
  submitterEmail: string;
  submitterPhone: string;
  businessName: string;
  // Step 4 — listing content
  title: string;
  description: string;
  city: string;
  subcategory: string;
  draftWebsite: string;
  draftInstagram: string;
  draftPhone: string;
  draftEmail: string;
  // Step 5 — consent
  consentGiven: boolean;
  // Step 6 — OTP
  otpCode: string;
}

type AiDraft = {
  title: string;
  description: string;
  city: string;
  subcategory: string;
  tags: string[];
  website: string;
  instagram: string;
  facebook: string;
  phone: string;
  email: string;
};

type AiAnalysis = {
  score: number;
  summary: string;
  flags: string[];
  draft: AiDraft;
};

/* ---------- Constants ---------- */

const LISTING_TYPES: { value: ListingType; label: string; icon: string; desc: string }[] = [
  { value: "stay", label: "Stay", icon: "🏡", desc: "Hotels, villas, lodges, guesthouses" },
  { value: "experience", label: "Experience", icon: "🦁", desc: "Safaris, tours, diving, classes" },
  { value: "event", label: "Event", icon: "🎉", desc: "Festivals, concerts, exhibitions" },
  { value: "service", label: "Service", icon: "🔧", desc: "Car hire, agencies, wellness, IT" },
  { value: "real_estate", label: "Real Estate", icon: "🏠", desc: "For sale, land, commercial" },
];

const KENYAN_CITIES = [
  "Nairobi", "Mombasa", "Diani", "Watamu", "Malindi", "Kilifi", "Lamu",
  "Nanyuki", "Nakuru", "Kisumu", "Eldoret", "Nyeri", "Naivasha", "Amboseli",
  "Maasai Mara", "Tsavo", "Samburu", "Isiolo", "Thika", "Machakos",
];

const CONSENT_TEXT =
  "I confirm that I am authorised to list this business on Klickenya, that all information provided is accurate, and that I agree to Klickenya's listing terms. I understand that submissions are reviewed before going live.";

/* ---------- Step indicator ---------- */

const STEP_LABELS: Record<Step, string> = {
  type: "Type",
  ai: "AI Assist",
  details: "Your Details",
  content: "Listing Content",
  consent: "Consent",
  otp: "Verify Email",
  success: "Done",
};

const STEP_ORDER: Step[] = ["type", "ai", "details", "content", "consent", "otp", "success"];

function StepDots({ current }: { current: Step }) {
  const visible: Step[] = ["type", "ai", "details", "content", "consent", "otp"];
  const currentIdx = visible.indexOf(current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {visible.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < currentIdx
                ? "bg-[#E8A020] text-white"
                : i === currentIdx
                ? "bg-[#16130C] text-white"
                : "bg-[#E2DDD5] text-[#9C9485]"
            }`}
          >
            {i < currentIdx ? "✓" : i + 1}
          </div>
          {i < visible.length - 1 && (
            <div className={`h-0.5 w-6 ${i < currentIdx ? "bg-[#E8A020]" : "bg-[#E2DDD5]"}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-sm text-[#5E5848]">{STEP_LABELS[current]}</span>
    </div>
  );
}

/* ---------- Input helpers ---------- */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-[#16130C] mb-1.5">{children}</label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full border border-[#D4CFC6] rounded-xl px-4 py-3 text-[16px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020] bg-white"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-[#D4CFC6] rounded-xl px-4 py-3 text-[16px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020] bg-white resize-none"
    />
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full bg-[#E8A020] hover:bg-[#D4901C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base py-3.5 rounded-xl transition-colors"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

/* ---------- Main component ---------- */

export default function ListingForm() {
  const [step, setStep] = useState<Step>("type");
  const [submissionId, setSubmissionId] = useState<string>("");
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  const [form, setForm] = useState<FormData>({
    listingType: "",
    websiteUrl: "",
    googlePlaceId: "",
    submitterName: "",
    submitterEmail: "",
    submitterPhone: "",
    businessName: "",
    title: "",
    description: "",
    city: "",
    subcategory: "",
    draftWebsite: "",
    draftInstagram: "",
    draftPhone: "",
    draftEmail: "",
    consentGiven: false,
    otpCode: "",
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /* --- Step 1: type --- */

  function handleTypeSelect(type: ListingType) {
    set("listingType", type);
    set("subcategory", ""); // reset subcategory when type changes
  }

  /* --- Step 2: AI Assist --- */

  async function handleAiAnalyse() {
    setAiError("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/list/ai-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingType: form.listingType,
          websiteUrl: form.websiteUrl || undefined,
          googlePlaceId: form.googlePlaceId || undefined,
          businessName: form.businessName || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiError(json.error ?? "Analysis failed.");
        return;
      }
      const analysis: AiAnalysis = json.analysis;
      setAiAnalysis(analysis);

      // Pre-fill content step from draft
      const d = analysis.draft;
      setForm((f) => ({
        ...f,
        title: d.title || f.title,
        description: d.description || f.description,
        city: d.city || f.city,
        subcategory: d.subcategory || f.subcategory,
        draftWebsite: d.website || f.draftWebsite,
        draftInstagram: d.instagram || f.draftInstagram,
        draftPhone: d.phone || f.draftPhone,
        draftEmail: d.email || f.draftEmail,
      }));

      setStep("details");
    } catch {
      setAiError("Something went wrong. Please continue without AI assist.");
    } finally {
      setAiLoading(false);
    }
  }

  /* --- Step 5: Submit --- */

  async function handleSubmit() {
    setSubmitError("");
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/list/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingType: form.listingType,
          submitterName: form.submitterName,
          submitterEmail: form.submitterEmail,
          submitterPhone: form.submitterPhone,
          businessName: form.businessName,
          websiteUrl: form.websiteUrl || undefined,
          googlePlaceId: form.googlePlaceId || undefined,
          draftTitle: form.title,
          draftDescription: form.description,
          draftCity: form.city,
          draftSubcategory: form.subcategory,
          draftWebsite: form.draftWebsite || undefined,
          draftInstagram: form.draftInstagram || undefined,
          draftPhone: form.draftPhone || undefined,
          draftEmail: form.draftEmail || undefined,
          aiScore: aiAnalysis?.score ?? null,
          aiSummary: aiAnalysis?.summary ?? null,
          aiFlags: aiAnalysis?.flags ?? null,
          consentGiven: form.consentGiven,
          consentTimestamp: new Date().toISOString(),
          consentText: CONSENT_TEXT,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmissionId(json.submissionId);
      setStep("otp");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  }

  /* --- Step 6: OTP --- */

  async function handleOtpVerify() {
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch("/api/list/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          otpCode: form.otpCode,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setOtpError(json.error ?? "Invalid code. Please try again.");
        return;
      }
      setStep("success");
    } catch {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  /* -------- Render steps -------- */

  if (step === "success") {
    return (
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-extrabold text-[#16130C] mb-2">Submission received!</h2>
        <p className="text-[#5E5848] mb-6 max-w-md mx-auto">
          We'll review your listing within 1–2 business days. You'll receive an email once it's
          live on Klickenya.
        </p>
        <a
          href="/"
          className="inline-block bg-[#E8A020] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#D4901C] transition-colors"
        >
          Back to home
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2DDD5] p-6 sm:p-8">
      {step !== "success" && <StepDots current={step} />}

      {/* ---- Step 1: Choose type ---- */}
      {step === "type" && (
        <div>
          <h2 className="text-xl font-extrabold text-[#16130C] mb-1">What type of listing?</h2>
          <p className="text-sm text-[#5E5848] mb-6">Choose the category that best fits your business.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {LISTING_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTypeSelect(t.value)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  form.listingType === t.value
                    ? "border-[#E8A020] bg-[#FDF8F0]"
                    : "border-[#E2DDD5] hover:border-[#D4CFC6] bg-white"
                }`}
              >
                <div className="text-2xl mb-1">{t.icon}</div>
                <div className="font-bold text-[#16130C] text-sm">{t.label}</div>
                <div className="text-xs text-[#5E5848] mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
          <PrimaryButton
            onClick={() => setStep("ai")}
            disabled={!form.listingType}
          >
            Continue →
          </PrimaryButton>
        </div>
      )}

      {/* ---- Step 2: AI Assist ---- */}
      {step === "ai" && (
        <div>
          <h2 className="text-xl font-extrabold text-[#16130C] mb-1">Let AI draft your listing</h2>
          <p className="text-sm text-[#5E5848] mb-6">
            Paste your website URL or Google Place ID and we'll auto-fill your listing. You can
            edit everything afterwards. Skip if you prefer to fill it in manually.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <Label>Business name</Label>
              <Input
                value={form.businessName}
                onChange={(v) => set("businessName", v)}
                placeholder="e.g. Watamu Beach House"
              />
            </div>
            <div>
              <Label>Website URL (optional)</Label>
              <Input
                value={form.websiteUrl}
                onChange={(v) => set("websiteUrl", v)}
                placeholder="https://yourbusiness.com"
                type="url"
              />
            </div>
            <div>
              <Label>Google Place ID (optional)</Label>
              <Input
                value={form.googlePlaceId}
                onChange={(v) => set("googlePlaceId", v)}
                placeholder="ChIJ..."
              />
              <p className="text-xs text-[#9C9485] mt-1">
                Find it at{" "}
                <span className="text-[#E8A020]">google.com/maps</span> → share → copy link → extract the CID parameter.
              </p>
            </div>
          </div>

          {aiError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4">{aiError}</p>
          )}

          {aiAnalysis && (
            <div className="bg-[#FDF8F0] border border-[#E8A020] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-[#16130C]">AI Quality Score</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    aiAnalysis.score >= 80
                      ? "bg-green-100 text-green-700"
                      : aiAnalysis.score >= 60
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {aiAnalysis.score}/100
                </span>
              </div>
              <p className="text-sm text-[#5E5848]">{aiAnalysis.summary}</p>
            </div>
          )}

          <div className="space-y-3">
            <PrimaryButton
              onClick={handleAiAnalyse}
              loading={aiLoading}
              disabled={!form.businessName && !form.websiteUrl && !form.googlePlaceId}
            >
              ✨ Analyse with AI
            </PrimaryButton>
            <button
              type="button"
              onClick={() => setStep("details")}
              className="w-full py-3 text-sm font-semibold text-[#5E5848] hover:text-[#16130C] transition-colors"
            >
              Skip — fill in manually →
            </button>
          </div>
        </div>
      )}

      {/* ---- Step 3: Submitter details ---- */}
      {step === "details" && (
        <div>
          <h2 className="text-xl font-extrabold text-[#16130C] mb-1">Your contact details</h2>
          <p className="text-sm text-[#5E5848] mb-6">
            We'll use these to send your verification code and contact you about your listing.
          </p>
          <div className="space-y-4 mb-8">
            <div>
              <Label>Your full name *</Label>
              <Input
                value={form.submitterName}
                onChange={(v) => set("submitterName", v)}
                placeholder="e.g. Amina Wanjiru"
                required
              />
            </div>
            <div>
              <Label>Email address *</Label>
              <Input
                value={form.submitterEmail}
                onChange={(v) => set("submitterEmail", v)}
                placeholder="you@example.com"
                type="email"
                required
              />
            </div>
            <div>
              <Label>Phone number *</Label>
              <Input
                value={form.submitterPhone}
                onChange={(v) => set("submitterPhone", v)}
                placeholder="+254 7XX XXX XXX"
                type="tel"
                required
              />
            </div>
            {!form.businessName && (
              <div>
                <Label>Business name *</Label>
                <Input
                  value={form.businessName}
                  onChange={(v) => set("businessName", v)}
                  placeholder="e.g. Watamu Beach House"
                  required
                />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <PrimaryButton
              onClick={() => setStep("content")}
              disabled={
                !form.submitterName.trim() ||
                !form.submitterEmail.trim() ||
                !form.submitterPhone.trim() ||
                !form.businessName.trim()
              }
            >
              Continue →
            </PrimaryButton>
            <button
              type="button"
              onClick={() => setStep("ai")}
              className="w-full py-3 text-sm font-semibold text-[#5E5848] hover:text-[#16130C] transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ---- Step 4: Listing content ---- */}
      {step === "content" && (
        <div>
          <h2 className="text-xl font-extrabold text-[#16130C] mb-1">About your listing</h2>
          <p className="text-sm text-[#5E5848] mb-6">
            {aiAnalysis
              ? "We've pre-filled these from your website. Edit anything that looks wrong."
              : "Tell us about your business. Our team will review and may edit before publishing."}
          </p>

          <div className="space-y-5 mb-8">
            <div>
              <Label>Listing title *</Label>
              <Input
                value={form.title}
                onChange={(v) => set("title", v)}
                placeholder="e.g. Watamu Beach House"
                required
              />
              <p className="text-xs text-[#9C9485] mt-1">3–8 words, e.g. the name of your business</p>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(v) => set("description", v)}
                placeholder="Describe your business in 80–300 words. What makes it special? What can visitors expect?"
                rows={6}
              />
              <p className="text-xs text-[#9C9485] mt-1">
                {form.description.split(/\s+/).filter(Boolean).length} words (aim for 80–300)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>City / Location *</Label>
                <select
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className="w-full border border-[#D4CFC6] rounded-xl px-4 py-3 text-[16px] text-[#16130C] focus:outline-none focus:ring-2 focus:ring-[#E8A020] bg-white"
                >
                  <option value="">Select city…</option>
                  {KENYAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label>Category *</Label>
                <select
                  value={form.subcategory}
                  onChange={(e) => set("subcategory", e.target.value)}
                  className="w-full border border-[#D4CFC6] rounded-xl px-4 py-3 text-[16px] text-[#16130C] focus:outline-none focus:ring-2 focus:ring-[#E8A020] bg-white"
                >
                  <option value="">Select category…</option>
                  {(SUBCATEGORIES_BY_TYPE[form.listingType] ?? []).map((s) => (
                    <option key={s} value={s}>
                      {SUBCATEGORY_LABELS[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional contact / social */}
            <details className="border border-[#E2DDD5] rounded-xl overflow-hidden">
              <summary className="px-4 py-3 text-sm font-semibold text-[#16130C] cursor-pointer select-none hover:bg-[#FAFAF8]">
                Website & social links (optional)
              </summary>
              <div className="px-4 pb-4 space-y-4 pt-2">
                <div>
                  <Label>Website URL</Label>
                  <Input
                    value={form.draftWebsite}
                    onChange={(v) => set("draftWebsite", v)}
                    placeholder="https://yourbusiness.com"
                    type="url"
                  />
                </div>
                <div>
                  <Label>Instagram handle</Label>
                  <Input
                    value={form.draftInstagram}
                    onChange={(v) => set("draftInstagram", v)}
                    placeholder="yourbusiness (without @)"
                  />
                </div>
                <div>
                  <Label>Business phone</Label>
                  <Input
                    value={form.draftPhone}
                    onChange={(v) => set("draftPhone", v)}
                    placeholder="+254 7XX XXX XXX"
                    type="tel"
                  />
                </div>
                <div>
                  <Label>Business email</Label>
                  <Input
                    value={form.draftEmail}
                    onChange={(v) => set("draftEmail", v)}
                    placeholder="hello@yourbusiness.com"
                    type="email"
                  />
                </div>
              </div>
            </details>
          </div>

          <div className="space-y-3">
            <PrimaryButton
              onClick={() => setStep("consent")}
              disabled={
                !form.title.trim() ||
                !form.description.trim() ||
                !form.city ||
                !form.subcategory
              }
            >
              Continue →
            </PrimaryButton>
            <button
              type="button"
              onClick={() => setStep("details")}
              className="w-full py-3 text-sm font-semibold text-[#5E5848] hover:text-[#16130C] transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ---- Step 5: Consent ---- */}
      {step === "consent" && (
        <div>
          <h2 className="text-xl font-extrabold text-[#16130C] mb-1">Review & consent</h2>
          <p className="text-sm text-[#5E5848] mb-6">
            Please review your submission summary before submitting.
          </p>

          {/* Summary card */}
          <div className="bg-[#FAFAF8] border border-[#E2DDD5] rounded-xl p-5 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#9C9485]">Type</span>
              <span className="font-semibold text-[#16130C] capitalize">{form.listingType.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9C9485]">Business</span>
              <span className="font-semibold text-[#16130C]">{form.businessName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9C9485]">Title</span>
              <span className="font-semibold text-[#16130C]">{form.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9C9485]">City</span>
              <span className="font-semibold text-[#16130C]">{form.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9C9485]">Submitter</span>
              <span className="font-semibold text-[#16130C]">{form.submitterName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9C9485]">Email</span>
              <span className="font-semibold text-[#16130C]">{form.submitterEmail}</span>
            </div>
            {aiAnalysis && (
              <div className="flex justify-between">
                <span className="text-[#9C9485]">AI Score</span>
                <span
                  className={`font-bold ${
                    aiAnalysis.score >= 80
                      ? "text-green-600"
                      : aiAnalysis.score >= 60
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {aiAnalysis.score}/100
                </span>
              </div>
            )}
          </div>

          {/* Consent checkbox */}
          <label className="flex gap-3 items-start cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={form.consentGiven}
              onChange={(e) => set("consentGiven", e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-[#D4CFC6] accent-[#E8A020] flex-shrink-0"
            />
            <span className="text-sm text-[#5E5848] leading-relaxed">{CONSENT_TEXT}</span>
          </label>

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4">{submitError}</p>
          )}

          <div className="space-y-3">
            <PrimaryButton
              onClick={handleSubmit}
              loading={submitLoading}
              disabled={!form.consentGiven}
            >
              Submit listing →
            </PrimaryButton>
            <button
              type="button"
              onClick={() => setStep("content")}
              className="w-full py-3 text-sm font-semibold text-[#5E5848] hover:text-[#16130C] transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ---- Step 6: OTP ---- */}
      {step === "otp" && (
        <div>
          <h2 className="text-xl font-extrabold text-[#16130C] mb-1">Verify your email</h2>
          <p className="text-sm text-[#5E5848] mb-6">
            We've sent a 6-digit code to{" "}
            <strong className="text-[#16130C]">{form.submitterEmail}</strong>. Enter it below to
            confirm your submission.
          </p>
          <div className="mb-6">
            <Label>Verification code</Label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={form.otpCode}
              onChange={(e) => set("otpCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full border border-[#D4CFC6] rounded-xl px-4 py-3 text-[16px] text-center tracking-[0.5em] font-bold text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020] bg-white"
            />
            <p className="text-xs text-[#9C9485] mt-1">Code expires in 15 minutes.</p>
          </div>

          {otpError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4">{otpError}</p>
          )}

          <PrimaryButton
            onClick={handleOtpVerify}
            loading={otpLoading}
            disabled={form.otpCode.length !== 6}
          >
            Verify & submit →
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
