"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Reusable pill selector ---------- */

function PillSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() =>
            onChange(
              selected.includes(opt)
                ? selected.filter((s) => s !== opt)
                : [...selected, opt]
            )
          }
          className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 ${
            selected.includes(opt)
              ? "bg-purple-500 text-white"
              : "bg-surface text-text2 hover:bg-purple-100"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ---------- Constants ---------- */

const KENYAN_CITIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Malindi",
  "Diani",
  "Nanyuki",
  "Thika",
  "Nyeri",
  "Kilifi",
  "Watamu",
  "Lamu",
  "Naivasha",
  "Karen",
  "Westlands",
  "Kiambu",
  "Ruaka",
  "Athi River",
  "Machakos",
];

const SPECIALISATIONS = [
  "Residential Sales",
  "Residential Lettings",
  "Commercial",
  "Land",
  "Off-plan / New Build",
  "Luxury / High-end",
  "Diaspora Clients",
  "Short-term Rentals",
  "Property Management",
];

const PROPERTY_TYPES = [
  "Apartment / Flat",
  "House / Villa",
  "Townhouse",
  "Penthouse",
  "Studio",
  "Bedsitter",
  "Bungalow",
  "Maisonette",
  "Land / Plot",
  "Commercial Space",
  "Office",
  "Warehouse",
  "Other",
];

const FEATURES = [
  "Pool",
  "Parking",
  "Security",
  "Garden",
  "Gym",
  "Furnished",
  "DSQ",
  "Lift",
  "Borehole",
  "Solar",
  "Generator",
  "Sea view",
  "City view",
];

const DEV_TYPES = [
  "Apartment Complex",
  "Gated Community",
  "Mixed-use Development",
  "Townhouse Estate",
  "Commercial Centre",
  "Other",
];

const DEV_UNIT_TYPES = [
  "Studio",
  "1 Bed",
  "2 Bed",
  "3 Bed",
  "4+ Bed",
  "Penthouse",
  "Duplex",
  "Townhouse",
  "Commercial Unit",
];

const DEV_AMENITIES = [
  "Pool",
  "Gym",
  "Clubhouse",
  "Playground",
  "CCTV",
  "Backup Generator",
  "Borehole",
  "Solar",
  "Rooftop Terrace",
  "EV Charging",
  "Concierge",
  "Jogging Track",
];

const DEV_MATERIALS = [
  "Brochure / PDF",
  "Floor plans",
  "Site plan",
  "Price list",
  "Renders / CGI",
  "Progress photos",
  "Video walkthrough",
];

const LISTING_AS_OPTIONS = [
  {
    value: "agent",
    icon: "\uD83C\uDFE2",
    title: "Real Estate Agent",
    description:
      "I'm a licensed agent with a portfolio of properties to list",
  },
  {
    value: "owner",
    icon: "\uD83C\uDFE0",
    title: "Private Owner",
    description: "I own one or more properties I want to sell or rent",
  },
  {
    value: "developer",
    icon: "\uD83C\uDFD7",
    title: "Property Developer",
    description:
      "I'm developing a new project and want to reach pre-qualified buyers",
  },
  {
    value: "other",
    icon: "\uD83E\uDD1D",
    title: "Other / Not Sure",
    description:
      "I want to list but I'm not sure which category fits me",
  },
] as const;

/* ---------- Page Component ---------- */

export default function RealEstateListPage() {
  /* ── Ambient glow ── */
  const headerRef = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      setGlowPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
    el.addEventListener("mousemove", handleMove);
    return () => el.removeEventListener("mousemove", handleMove);
  }, []);

  /* ── Form state ── */
  const [listingAs, setListingAs] = useState<string | null>(null);
  const [step, setStep] = useState<"type" | "form" | "success">("type");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contact fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  // Agent fields
  const [agencyName, setAgencyName] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [propertyCount, setPropertyCount] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [specialisations, setSpecialisations] = useState<string[]>([]);
  const [agentWebsite, setAgentWebsite] = useState("");
  const [agentNotes, setAgentNotes] = useState("");

  // Owner fields
  const [propertyType, setPropertyType] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [ownerCity, setOwnerCity] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [leaseDuration, setLeaseDuration] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [ownerDescription, setOwnerDescription] = useState("");
  const [photoOption, setPhotoOption] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // Developer fields
  const [devName, setDevName] = useState("");
  const [devType, setDevType] = useState("");
  const [devCity, setDevCity] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [completionStatus, setCompletionStatus] = useState("");
  const [expectedCompletion, setExpectedCompletion] = useState("");
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [devAmenities, setDevAmenities] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [devWebsite, setDevWebsite] = useState("");
  const [devNotes, setDevNotes] = useState("");

  // Other fields
  const [otherDescription, setOtherDescription] = useState("");
  const [otherCity, setOtherCity] = useState("");
  const [otherPrice, setOtherPrice] = useState("");

  const formRef = useRef<HTMLDivElement>(null);

  /* ── Helpers ── */
  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-border text-[15px] text-dark placeholder:text-text3 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors bg-white";
  const labelCls = "block text-[13px] font-semibold text-dark mb-1.5";
  const sectionHeading = "text-[18px] font-bold text-dark mb-4 mt-8";
  const selectCls = cn(inputCls, "appearance-none");

  function handleSelectListingAs(value: string) {
    setListingAs(value);
    setStep("form");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const basePayload = {
      listingAs,
      name,
      email,
      phone,
      consentGiven,
      consentTimestamp: new Date().toISOString(),
    };

    let typePayload = {};

    switch (listingAs) {
      case "agent":
        typePayload = {
          agencyName,
          licenceNumber: licenceNumber || undefined,
          propertyCount: propertyCount || undefined,
          cities,
          specialisations,
          agentWebsite: agentWebsite || undefined,
          agentNotes: agentNotes || undefined,
        };
        break;
      case "owner":
        typePayload = {
          propertyType,
          transactionType,
          ownerCity,
          neighbourhood: neighbourhood || undefined,
          askingPrice: askingPrice || undefined,
          monthlyRent: monthlyRent || undefined,
          leaseDuration: leaseDuration || undefined,
          bedrooms: bedrooms || undefined,
          sizeSqm: sizeSqm || undefined,
          features,
          ownerDescription: ownerDescription || undefined,
          photoOption: photoOption || undefined,
          photoUrl: photoUrl || undefined,
        };
        break;
      case "developer":
        typePayload = {
          devName,
          devType,
          devCity,
          totalUnits: totalUnits || undefined,
          startingPrice: startingPrice || undefined,
          completionStatus: completionStatus || undefined,
          expectedCompletion: expectedCompletion || undefined,
          unitTypes,
          devAmenities,
          materials,
          devWebsite: devWebsite || undefined,
          devNotes: devNotes || undefined,
        };
        break;
      case "other":
        typePayload = {
          otherDescription,
          otherCity: otherCity || undefined,
          otherPrice: otherPrice || undefined,
        };
        break;
    }

    try {
      const res = await fetch("/api/real-estate/listing-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...basePayload, ...typePayload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      setStep("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Contact valid ── */
  const contactValid =
    name.length >= 2 && email.includes("@") && phone.length >= 9;

  /* ── Success message ── */
  function getSuccessMessage() {
    switch (listingAs) {
      case "agent":
        return "We'll review your agency profile and get your properties listed within 24 hours. You'll receive a confirmation email shortly.";
      case "owner":
        return "We'll create a beautiful listing for your property within 24 hours. You'll receive a confirmation email with a preview link.";
      case "developer":
        return "We'll set up your development project page within 24 hours. Our team will reach out to discuss featuring options.";
      default:
        return "We'll review your request and get back to you within 24 hours. Check your email for a confirmation.";
    }
  }

  /* ══════════════════════════════════════ */
  /* SUCCESS STATE                         */
  /* ══════════════════════════════════════ */
  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="bg-dark px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/klickenya-mark.svg" alt="Klickenya" className="h-8 w-8" />
            <span className="text-white font-bold text-lg">
              Klic<span className="text-amber">Kenya</span>
            </span>
          </Link>
        </div>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-green flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Check className="size-8 text-white" strokeWidth={3} />
          </div>
          <h2 className="font-display text-[24px] font-bold text-dark mb-3">
            Request received!
          </h2>
          <p className="text-[15px] text-text2 leading-relaxed mb-8 max-w-md mx-auto">
            {getSuccessMessage()}
          </p>
          <Link
            href="/real-estate"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber text-dark font-bold text-[15px] hover:bg-[#d4910f] transition-colors"
          >
            Back to properties →
          </Link>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════ */
  /* MAIN RENDER                           */
  /* ══════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* ── Header bar ── */}
      <div className="bg-dark px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/klickenya-mark.svg" alt="Klickenya" className="h-8 w-8" />
          <span className="text-white font-bold text-lg">
            Klic<span className="text-amber">Kenya</span>
          </span>
        </Link>
        <Link
          href="/real-estate"
          className="text-[12px] text-white/50 hover:text-white transition-colors"
        >
          Back to properties
        </Link>
      </div>

      {/* ── Two-column layout ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-14">

          {/* ── Left: form ── */}
          <div>
            {/* Page heading */}
            <h1 className="font-display text-[clamp(24px,3.5vw,32px)] font-bold text-dark mb-2 tracking-[-0.02em]">
              List your property on Klickenya
            </h1>
            <p className="text-[15px] text-text2 mb-8 max-w-md">
              Tell us about yourself and your property. Our team will create your
              listing within 24 hours — completely free.
            </p>

            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 md:p-8">
          {/* ── STEP 1: Who are you? ── */}
          <div>
            <h2 className="text-[18px] font-bold text-dark mb-1">
              Who are you?
            </h2>
            <p className="text-[13px] text-text2 mb-5">
              Select the option that best describes you.
            </p>

            <div className="space-y-3">
              {LISTING_AS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectListingAs(opt.value)}
                  className={cn(
                    "w-full text-left rounded-xl p-4 flex items-start gap-4 transition-all duration-150",
                    listingAs === opt.value
                      ? "border-2 border-purple-500 bg-purple-50"
                      : "border border-border hover:border-purple-300"
                  )}
                >
                  <span className="text-2xl leading-none mt-0.5">
                    {opt.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-dark">
                      {opt.title}
                    </p>
                    <p className="text-[13px] text-text2 mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── STEP 2 + 3: Form (contact + dynamic fields) ── */}
          {step === "form" && listingAs && (
            <form onSubmit={handleSubmit}>
              <div ref={formRef}>
                {/* ── Contact details ── */}
                <h3 className={sectionHeading}>Contact details</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Phone / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 700 000 000"
                      className={inputCls}
                    />
                    <p className="text-[12px] text-text3 mt-1">
                      We&apos;ll use WhatsApp for quick follow-ups if available.
                    </p>
                  </div>
                </div>

                {/* ══════════════════════════════════════ */}
                {/* AGENT FIELDS                          */}
                {/* ══════════════════════════════════════ */}
                {listingAs === "agent" && (
                  <>
                    <h3 className={sectionHeading}>Agency details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>
                          Agency / company name{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          placeholder="e.g. HassConsult, Knight Frank"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Licence / registration number
                        </label>
                        <input
                          type="text"
                          value={licenceNumber}
                          onChange={(e) => setLicenceNumber(e.target.value)}
                          placeholder="Optional"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          How many properties would you like to list?
                        </label>
                        <select
                          value={propertyCount}
                          onChange={(e) => setPropertyCount(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Select...</option>
                          <option value="1-5">1 - 5</option>
                          <option value="6-20">6 - 20</option>
                          <option value="21-50">21 - 50</option>
                          <option value="50+">50+</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>
                          Cities you operate in
                        </label>
                        <PillSelect
                          options={KENYAN_CITIES}
                          selected={cities}
                          onChange={setCities}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Specialisations</label>
                        <PillSelect
                          options={SPECIALISATIONS}
                          selected={specialisations}
                          onChange={setSpecialisations}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Website</label>
                        <input
                          type="url"
                          value={agentWebsite}
                          onChange={(e) => setAgentWebsite(e.target.value)}
                          placeholder="https://youragency.com"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Anything else we should know?
                        </label>
                        <textarea
                          value={agentNotes}
                          onChange={(e) => setAgentNotes(e.target.value)}
                          rows={3}
                          placeholder="e.g. We focus on diaspora clients, bulk upload needs, etc."
                          className={cn(inputCls, "resize-none")}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ══════════════════════════════════════ */}
                {/* OWNER FIELDS                          */}
                {/* ══════════════════════════════════════ */}
                {listingAs === "owner" && (
                  <>
                    <h3 className={sectionHeading}>Property details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>
                          Property type{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={propertyType}
                          onChange={(e) => setPropertyType(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Select...</option>
                          {PROPERTY_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>
                          Transaction type{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={transactionType}
                          onChange={(e) => setTransactionType(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Select...</option>
                          <option value="For Sale">For Sale</option>
                          <option value="For Rent">For Rent</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={ownerCity}
                          onChange={(e) => setOwnerCity(e.target.value)}
                          placeholder="e.g. Nairobi, Mombasa, Diani"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Neighbourhood / area</label>
                        <input
                          type="text"
                          value={neighbourhood}
                          onChange={(e) => setNeighbourhood(e.target.value)}
                          placeholder="e.g. Westlands, Kilimani, Nyali"
                          className={inputCls}
                        />
                      </div>

                      {(transactionType === "For Sale" ||
                        transactionType === "Both") && (
                        <div>
                          <label className={labelCls}>Asking price</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-text3 font-medium">
                              KSh
                            </span>
                            <input
                              type="text"
                              value={askingPrice}
                              onChange={(e) => setAskingPrice(e.target.value)}
                              placeholder="e.g. 15,000,000"
                              className={cn(inputCls, "pl-12")}
                            />
                          </div>
                        </div>
                      )}

                      {(transactionType === "For Rent" ||
                        transactionType === "Both") && (
                        <>
                          <div>
                            <label className={labelCls}>Monthly rent</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-text3 font-medium">
                                KSh
                              </span>
                              <input
                                type="text"
                                value={monthlyRent}
                                onChange={(e) => setMonthlyRent(e.target.value)}
                                placeholder="e.g. 85,000"
                                className={cn(inputCls, "pl-12")}
                              />
                            </div>
                          </div>
                          <div>
                            <label className={labelCls}>Lease duration</label>
                            <div className="flex gap-3">
                              {[
                                "Monthly",
                                "6 months",
                                "12 months",
                                "Flexible",
                              ].map((opt) => (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <input
                                    type="radio"
                                    name="leaseDuration"
                                    value={opt}
                                    checked={leaseDuration === opt}
                                    onChange={(e) =>
                                      setLeaseDuration(e.target.value)
                                    }
                                    className="accent-purple-500"
                                  />
                                  <span className="text-[13px] text-text2">
                                    {opt}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className={labelCls}>Bedrooms</label>
                        <select
                          value={bedrooms}
                          onChange={(e) => setBedrooms(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Select...</option>
                          <option value="Studio">Studio</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="6+">6+</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>
                          Size (sq m)
                        </label>
                        <input
                          type="text"
                          value={sizeSqm}
                          onChange={(e) => setSizeSqm(e.target.value)}
                          placeholder="e.g. 120"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Features</label>
                        <PillSelect
                          options={FEATURES}
                          selected={features}
                          onChange={setFeatures}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Description</label>
                        <textarea
                          value={ownerDescription}
                          onChange={(e) => setOwnerDescription(e.target.value)}
                          rows={3}
                          placeholder="Tell us more about the property..."
                          className={cn(inputCls, "resize-none")}
                        />
                      </div>

                      {/* Photo options */}
                      <div>
                        <label className={labelCls}>Photos</label>
                        <div className="space-y-2">
                          {[
                            {
                              value: "will_email",
                              label: "I'll email photos to hello@klickenya.com",
                            },
                            {
                              value: "whatsapp",
                              label: "I'll send via WhatsApp",
                            },
                            {
                              value: "no_photos",
                              label:
                                "I don't have photos yet — Klickenya can help",
                            },
                            {
                              value: "url",
                              label:
                                "I have a link to photos (Google Drive, Dropbox, etc.)",
                            },
                          ].map((opt) => (
                            <label
                              key={opt.value}
                              className="flex items-center gap-3 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="photoOption"
                                value={opt.value}
                                checked={photoOption === opt.value}
                                onChange={(e) =>
                                  setPhotoOption(e.target.value)
                                }
                                className="accent-purple-500"
                              />
                              <span className="text-[13px] text-text2">
                                {opt.label}
                              </span>
                            </label>
                          ))}
                        </div>
                        {photoOption === "url" && (
                          <input
                            type="url"
                            value={photoUrl}
                            onChange={(e) => setPhotoUrl(e.target.value)}
                            placeholder="Paste your photo link here"
                            className={cn(inputCls, "mt-3")}
                          />
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ══════════════════════════════════════ */}
                {/* DEVELOPER FIELDS                      */}
                {/* ══════════════════════════════════════ */}
                {listingAs === "developer" && (
                  <>
                    <h3 className={sectionHeading}>Development details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>
                          Development name{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={devName}
                          onChange={(e) => setDevName(e.target.value)}
                          placeholder="e.g. Garden City Residences"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Development type{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={devType}
                          onChange={(e) => setDevType(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Select...</option>
                          {DEV_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={devCity}
                          onChange={(e) => setDevCity(e.target.value)}
                          placeholder="e.g. Nairobi, Mombasa"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Total units</label>
                        <input
                          type="text"
                          value={totalUnits}
                          onChange={(e) => setTotalUnits(e.target.value)}
                          placeholder="e.g. 120"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Starting price</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-text3 font-medium">
                            KSh
                          </span>
                          <input
                            type="text"
                            value={startingPrice}
                            onChange={(e) => setStartingPrice(e.target.value)}
                            placeholder="e.g. 8,500,000"
                            className={cn(inputCls, "pl-12")}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Completion status</label>
                        <select
                          value={completionStatus}
                          onChange={(e) => setCompletionStatus(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Select...</option>
                          <option value="Completed">Completed</option>
                          <option value="Under Construction">
                            Under Construction
                          </option>
                          <option value="Off-plan">Off-plan</option>
                          <option value="Phase 1 Complete">
                            Phase 1 Complete
                          </option>
                        </select>
                      </div>
                      {(completionStatus === "Under Construction" ||
                        completionStatus === "Off-plan") && (
                        <div>
                          <label className={labelCls}>
                            Expected completion date
                          </label>
                          <input
                            type="text"
                            value={expectedCompletion}
                            onChange={(e) =>
                              setExpectedCompletion(e.target.value)
                            }
                            placeholder="e.g. Q2 2027, December 2026"
                            className={inputCls}
                          />
                        </div>
                      )}
                      <div>
                        <label className={labelCls}>Unit types available</label>
                        <PillSelect
                          options={DEV_UNIT_TYPES}
                          selected={unitTypes}
                          onChange={setUnitTypes}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Amenities</label>
                        <PillSelect
                          options={DEV_AMENITIES}
                          selected={devAmenities}
                          onChange={setDevAmenities}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Marketing materials you can share
                        </label>
                        <div className="space-y-2">
                          {DEV_MATERIALS.map((mat) => (
                            <label
                              key={mat}
                              className="flex items-center gap-3 cursor-pointer group"
                            >
                              <div className="relative shrink-0">
                                <input
                                  type="checkbox"
                                  checked={materials.includes(mat)}
                                  onChange={(e) => {
                                    setMaterials((prev) =>
                                      e.target.checked
                                        ? [...prev, mat]
                                        : prev.filter((m) => m !== mat)
                                    );
                                  }}
                                  className="sr-only"
                                />
                                <div
                                  className={cn(
                                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                    materials.includes(mat)
                                      ? "bg-purple-500 border-purple-500"
                                      : "border-border bg-white group-hover:border-purple-300"
                                  )}
                                >
                                  {materials.includes(mat) && (
                                    <Check
                                      className="size-3 text-white"
                                      strokeWidth={3}
                                    />
                                  )}
                                </div>
                              </div>
                              <span className="text-[13px] text-text2">
                                {mat}
                              </span>
                            </label>
                          ))}
                        </div>
                        {materials.length > 0 && (
                          <p className="text-[12px] text-purple-600 mt-2">
                            Email your materials to{" "}
                            <strong>hello@klickenya.com</strong> with subject:
                            Materials for {devName || "your development"}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelCls}>Website</label>
                        <input
                          type="url"
                          value={devWebsite}
                          onChange={(e) => setDevWebsite(e.target.value)}
                          placeholder="https://yourdevelopment.com"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Anything else we should know?
                        </label>
                        <textarea
                          value={devNotes}
                          onChange={(e) => setDevNotes(e.target.value)}
                          rows={3}
                          placeholder="e.g. We'd like a featured banner, special payment plans available, etc."
                          className={cn(inputCls, "resize-none")}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ══════════════════════════════════════ */}
                {/* OTHER FIELDS                          */}
                {/* ══════════════════════════════════════ */}
                {listingAs === "other" && (
                  <>
                    <h3 className={sectionHeading}>Tell us more</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>
                          What would you like to list?{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          value={otherDescription}
                          onChange={(e) => setOtherDescription(e.target.value)}
                          rows={4}
                          placeholder="Describe your property or service..."
                          className={cn(inputCls, "resize-none")}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>City</label>
                        <input
                          type="text"
                          value={otherCity}
                          onChange={(e) => setOtherCity(e.target.value)}
                          placeholder="e.g. Nairobi, Mombasa"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Approximate price / budget
                        </label>
                        <input
                          type="text"
                          value={otherPrice}
                          onChange={(e) => setOtherPrice(e.target.value)}
                          placeholder="e.g. KSh 5,000,000"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ── Consent + submit ── */}
                <div className="mt-8 pt-6 border-t border-border">
                  <label className="flex items-start gap-3 cursor-pointer group mb-6">
                    <div className="relative shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                          consentGiven
                            ? "bg-purple-500 border-purple-500"
                            : "border-border bg-white group-hover:border-purple-300"
                        )}
                      >
                        {consentGiven && (
                          <Check
                            className="size-3 text-white"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-[13px] text-text2 leading-relaxed">
                      I agree that Klickenya may contact me about my listing
                      request via email, phone, or WhatsApp. I have read and
                      accept the{" "}
                      <Link
                        href="/terms"
                        className="text-purple-500 underline underline-offset-2"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="text-purple-500 underline underline-offset-2"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!consentGiven || !contactValid || isLoading}
                    className={cn(
                      "w-full rounded-full py-3.5 text-[15px] font-bold transition-all duration-200 flex items-center justify-center gap-2",
                      consentGiven && contactValid
                        ? "bg-purple-500 text-white hover:bg-purple-600 shadow-sm"
                        : "bg-border text-text3 cursor-not-allowed"
                    )}
                  >
                    {isLoading && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    {isLoading ? "Submitting..." : "Submit listing request"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("type");
                      setListingAs(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-center text-[13px] text-text3 hover:text-text2 mt-3 transition-colors"
                  >
                    &larr; Change selection
                  </button>
                </div>
              </div>
            </form>
          )}
            </div>
          </div>

          {/* ── Right: trust sidebar (desktop only) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-[80px] space-y-6">
              {/* How it works */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-[13px] font-bold text-dark uppercase tracking-[0.06em] mb-5">
                  How it works
                </h3>
                <div className="space-y-4">
                  {[
                    { num: "1", label: "Tell us about yourself", desc: "Agent, owner, or developer" },
                    { num: "2", label: "Share your property details", desc: "Type, location, price, photos" },
                    { num: "3", label: "We create your listing", desc: "Live within 24 hours, free" },
                  ].map((s, i) => (
                    <div key={s.num} className="flex items-start gap-3">
                      <span className="flex items-center justify-center size-8 rounded-full bg-purple-100 text-purple-600 text-[13px] font-bold shrink-0">
                        {s.num}
                      </span>
                      <div className="pt-0.5">
                        <p className="text-[14px] font-semibold text-dark">{s.label}</p>
                        <p className="text-[12px] text-text3 mt-0.5">{s.desc}</p>
                        {i < 2 && <div className="w-px h-3 bg-border ml-[15px] mt-2" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why list with us */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-[13px] font-bold text-dark uppercase tracking-[0.06em] mb-5">
                  Why list with us
                </h3>
                <div className="space-y-4">
                  {[
                    { icon: "🆓", title: "Completely free", desc: "No listing fees, no commission" },
                    { icon: "📩", title: "Direct enquiries", desc: "Buyers and renters contact you directly" },
                    { icon: "✓", title: "Verified badge", desc: "Build trust with a green tick on your listing" },
                    { icon: "📊", title: "Listing analytics", desc: "See views, enquiries, and performance" },
                    { icon: "🌍", title: "Reach all of Kenya", desc: "Buyers searching across 47 counties" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <span className="flex items-center justify-center size-8 rounded-lg bg-surface text-[15px] shrink-0">
                        {item.icon}
                      </span>
                      <div>
                        <p className="text-[14px] font-semibold text-dark">{item.title}</p>
                        <p className="text-[12px] text-text3 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonial */}
              <div className="bg-dark rounded-2xl p-6 text-center">
                <div className="flex justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-amber text-[16px]">★</span>
                  ))}
                </div>
                <p className="text-[14px] text-white/70 leading-relaxed mb-3 italic">
                  &ldquo;Listed our development in 10 minutes. The team had it live with professional descriptions by the next morning.&rdquo;
                </p>
                <p className="text-[12px] text-white/40">— Property developer, Nairobi</p>
              </div>

              {/* Security */}
              <div className="flex items-start gap-3 px-2">
                <span className="text-text3 text-[16px] mt-0.5">🔒</span>
                <p className="text-[12px] text-text3 leading-relaxed">
                  Your information is encrypted and secure. We never share your personal details without consent.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
