"use client";

import { useState } from "react";

const PROPERTY_TYPES = [
  "Apartment",
  "House",
  "Villa",
  "Townhouse",
  "Land",
  "Commercial",
  "Office",
] as const;

const LISTING_CATEGORIES = ["For Sale", "For Rent"] as const;

const KENYAN_CITIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Malindi",
  "Naivasha",
  "Nanyuki",
  "Nyeri",
  "Kilifi",
  "Diani",
  "Lamu",
  "Other",
] as const;

type FormStatus = "idle" | "loading" | "success" | "error";

export function ListPropertyForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyType, setPropertyType] = useState<string>("");
  const [listingCategory, setListingCategory] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    // Build a description that includes property-specific details
    const details = [
      propertyType && `Property type: ${propertyType}`,
      listingCategory && `Category: ${listingCategory}`,
      description && description,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/listing-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          listingType: "Real Estate",
          location: location || undefined,
          description: details || undefined,
        }),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "Something went wrong. Please try again."
        );
      }

      setStatus("success");
      setName("");
      setEmail("");
      setPhone("");
      setPropertyType("");
      setListingCategory("");
      setLocation("");
      setDescription("");
    } catch (err: unknown) {
      setStatus("error");
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setErrorMessage(message);
    }
  }

  if (status === "success") {
    return (
      <div className="bg-purple-dim border border-purple2/20 rounded-[20px] p-8 text-center">
        <span className="text-[40px] block mb-4">{"\u2705"}</span>
        <h3 className="text-[18px] font-semibold text-text mb-2">
          Request submitted!
        </h3>
        <p className="text-[14px] text-text2 leading-[1.65] max-w-[440px] mx-auto">
          Thanks for your interest in listing your property on Klickenya. Our
          team will review your request and get back to you within 24 hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-[14px] font-semibold text-purple2 hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-[12px] border border-border bg-white text-[15px] text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-purple2/40 focus:border-purple2 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label
          htmlFor="lp-name"
          className="block text-[13px] font-medium text-text mb-1.5"
        >
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          id="lp-name"
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className={inputClass}
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="lp-email"
          className="block text-[13px] font-medium text-text mb-1.5"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="lp-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="lp-phone"
          className="block text-[13px] font-medium text-text mb-1.5"
        >
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          id="lp-phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+254 700 000 000"
          className={inputClass}
        />
      </div>

      {/* Property Type & Listing Category — side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="lp-property-type"
            className="block text-[13px] font-medium text-text mb-1.5"
          >
            Property type
          </label>
          <select
            id="lp-property-type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            <option value="">Select type</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="lp-category"
            className="block text-[13px] font-medium text-text mb-1.5"
          >
            Listing category
          </label>
          <select
            id="lp-category"
            value={listingCategory}
            onChange={(e) => setListingCategory(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            <option value="">Select category</option>
            {LISTING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="lp-location"
          className="block text-[13px] font-medium text-text mb-1.5"
        >
          Location / City
        </label>
        <select
          id="lp-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={`${inputClass} appearance-none`}
        >
          <option value="">Select city</option>
          {KENYAN_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="lp-description"
          className="block text-[13px] font-medium text-text mb-1.5"
        >
          Description{" "}
          <span className="text-text3 font-normal">(optional)</span>
        </label>
        <textarea
          id="lp-description"
          rows={4}
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of your property — size, bedrooms, notable features..."
          className={`${inputClass} resize-none`}
        />
        <p className="text-[12px] text-text3 mt-1">
          {description.length}/300 characters
        </p>
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-[12px] px-4 py-3">
          <p className="text-[13px] text-red-600">{errorMessage}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-purple2 text-white font-semibold text-[15px] shadow-[0_4px_14px_rgba(139,77,171,0.35)] hover:shadow-[0_6px_20px_rgba(139,77,171,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_14px_rgba(139,77,171,0.35)]"
      >
        {status === "loading" ? "Submitting..." : "Submit listing request"}
      </button>
    </form>
  );
}
