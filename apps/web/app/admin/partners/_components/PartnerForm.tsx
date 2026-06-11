"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { EnabledModule, PartnerListingType } from "@/lib/partner/types";

const ALL_MODULES: { value: EnabledModule; label: string }[] = [
  { value: "stays", label: "Stays" },
  { value: "tours", label: "Tours" },
  { value: "events", label: "Events" },
  { value: "restaurant", label: "Restaurant" },
];

const ALL_LISTING_TYPES: { value: PartnerListingType; label: string }[] = [
  { value: "stay", label: "Stay" },
  { value: "experience", label: "Experience" },
  { value: "event", label: "Event" },
  { value: "rental", label: "Rental" },
  { value: "service", label: "Service" },
];

interface PartnerFormProps {
  mode: "create" | "edit";
  partner?: {
    _id: string;
    name: string;
    slug: string;
    colorPrimary?: string;
    colorAccent?: string;
    colorDark?: string;
    fontDisplay?: string;
    fontBody?: string;
    enabledModules?: string[];
    allowedListingTypes?: string[];
    domains?: string[];
    listingId?: string;
  };
  listings: Array<{ _id: string; title: string; city?: string; type?: string }>;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

interface CreateResult {
  storefrontUrl: string;
  domain?: string;
}

export function PartnerForm({ mode, partner, listings }: PartnerFormProps) {
  const router = useRouter();

  // Fields
  const [name, setName] = useState(partner?.name ?? "");
  const [slug, setSlug] = useState(partner?.slug ?? "");
  const [colorPrimary, setColorPrimary] = useState(partner?.colorPrimary ?? "#C97B2A");
  const [colorAccent, setColorAccent] = useState(partner?.colorAccent ?? "#7C4DFF");
  const [colorDark, setColorDark] = useState(partner?.colorDark ?? "#1A1209");
  const [fontDisplay, setFontDisplay] = useState(partner?.fontDisplay ?? "");
  const [fontBody, setFontBody] = useState(partner?.fontBody ?? "");
  const [enabledModules, setEnabledModules] = useState<EnabledModule[]>(
    (partner?.enabledModules as EnabledModule[] | undefined) ?? ["restaurant"]
  );
  const [allowedListingTypes, setAllowedListingTypes] = useState<PartnerListingType[]>(
    (partner?.allowedListingTypes as PartnerListingType[] | undefined) ?? ["stay", "experience"]
  );
  const [listingId, setListingId] = useState(partner?.listingId ?? (listings[0]?._id ?? ""));
  const [hostEmail, setHostEmail] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [domain, setDomain] = useState(partner?.domains?.[0] ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const slugManuallyEdited = useRef(mode === "edit");

  // Auto-derive slug from name in create mode
  useEffect(() => {
    if (mode === "create" && !slugManuallyEdited.current) {
      setSlug(slugify(name));
    }
  }, [name, mode]);

  function toggleModule(mod: EnabledModule) {
    setEnabledModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  }

  function toggleListingType(type: PartnerListingType) {
    setAllowedListingTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    if (mode === "create" && !hostEmail.trim()) return;
    if (mode === "create" && !listingId) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("slug", slug.trim());
      fd.append("colorPrimary", colorPrimary);
      fd.append("colorAccent", colorAccent);
      fd.append("colorDark", colorDark);
      fd.append("fontDisplay", fontDisplay);
      fd.append("fontBody", fontBody);
      fd.append("enabledModules", JSON.stringify(enabledModules));
      fd.append("allowedListingTypes", JSON.stringify(allowedListingTypes));

      if (mode === "create") {
        fd.append("listingId", listingId);
        fd.append("hostEmail", hostEmail.trim());
        fd.append("hostName", hostName.trim());
        fd.append("hostPhone", hostPhone.trim());
      }

      if (domain.trim()) fd.append("domain", domain.trim());
      if (logoFile) fd.append("logo", logoFile);

      const res = await fetch(
        mode === "create"
          ? "/api/admin/partners"
          : `/api/admin/partners/${partner!._id}`,
        { method: mode === "create" ? "POST" : "PATCH", body: fd }
        // No Content-Type header — browser sets the multipart boundary
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        setLoading(false);
        return;
      }
      if (mode === "create") {
        setResult(data as CreateResult);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 text-[16px] rounded-xl border border-border bg-canvas text-dark outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber";
  const labelClass = "block text-[12px] font-semibold text-text3 uppercase tracking-wide mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name + Slug */}
      <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
        <h2 className="font-display text-[16px] font-bold text-dark">Basic Info</h2>

        <div>
          <label className={labelClass}>Partner Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
            placeholder="e.g. Sarova Hotels"
          />
        </div>

        <div>
          <label className={labelClass}>Slug *</label>
          {mode === "edit" ? (
            <div className="px-4 py-2.5 rounded-xl border border-border bg-[#F7F5F2] text-text3 text-[16px] select-none">
              {slug}
            </div>
          ) : (
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                slugManuallyEdited.current = true;
                setSlug(slugify(e.target.value));
              }}
              required
              className={inputClass}
              placeholder="auto-derived from name"
            />
          )}
          <p className="mt-1 text-[11px] text-text3">Used in /w/{slug || "your-slug"}</p>
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
        <h2 className="font-display text-[16px] font-bold text-dark">Theme</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorPrimary}
                onChange={(e) => setColorPrimary(e.target.value)}
                className="size-10 rounded-lg border border-border cursor-pointer"
              />
              <span className="text-[13px] text-text3">{colorPrimary}</span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorAccent}
                onChange={(e) => setColorAccent(e.target.value)}
                className="size-10 rounded-lg border border-border cursor-pointer"
              />
              <span className="text-[13px] text-text3">{colorAccent}</span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Dark Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorDark}
                onChange={(e) => setColorDark(e.target.value)}
                className="size-10 rounded-lg border border-border cursor-pointer"
              />
              <span className="text-[13px] text-text3">{colorDark}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Display Font</label>
            <input
              type="text"
              value={fontDisplay}
              onChange={(e) => setFontDisplay(e.target.value)}
              className={inputClass}
              placeholder="e.g. Playfair Display"
            />
          </div>
          <div>
            <label className={labelClass}>Body Font</label>
            <input
              type="text"
              value={fontBody}
              onChange={(e) => setFontBody(e.target.value)}
              className={inputClass}
              placeholder="e.g. Inter"
            />
          </div>
        </div>
      </div>

      {/* Modules + Listing Types */}
      <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
        <h2 className="font-display text-[16px] font-bold text-dark">Feature Scoping</h2>
        <div>
          <label className={labelClass}>Enabled Modules</label>
          <div className="flex flex-wrap gap-3 mt-1">
            {ALL_MODULES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabledModules.includes(value)}
                  onChange={() => toggleModule(value)}
                  className="size-4 rounded accent-amber"
                />
                <span className="text-[14px] text-dark">{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Allowed Listing Types</label>
          <div className="flex flex-wrap gap-3 mt-1">
            {ALL_LISTING_TYPES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowedListingTypes.includes(value)}
                  onChange={() => toggleListingType(value)}
                  className="size-4 rounded accent-amber"
                />
                <span className="text-[14px] text-dark">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Listing assignment (create mode) */}
      {mode === "create" && (
        <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
          <h2 className="font-display text-[16px] font-bold text-dark">Assign Restaurant</h2>
          <div>
            <label className={labelClass}>Listing *</label>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              required
              className={`${inputClass} appearance-none`}
            >
              {listings.length === 0 && (
                <option value="">No unassigned listings available</option>
              )}
              {listings.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.title}{l.city ? ` — ${l.city}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Host details (create mode) */}
      {mode === "create" && (
        <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
          <h2 className="font-display text-[16px] font-bold text-dark">Partner Host Account</h2>
          <div>
            <label className={labelClass}>Host Email *</label>
            <input
              type="email"
              value={hostEmail}
              onChange={(e) => setHostEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="partner@example.com"
            />
          </div>
          <div>
            <label className={labelClass}>Host Name</label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className={inputClass}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className={labelClass}>Host Phone</label>
            <input
              type="tel"
              value={hostPhone}
              onChange={(e) => setHostPhone(e.target.value)}
              className={inputClass}
              placeholder="+254..."
            />
          </div>
        </div>
      )}

      {/* Domain + Logo */}
      <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
        <h2 className="font-display text-[16px] font-bold text-dark">Domain &amp; Branding</h2>
        <div>
          <label className={labelClass}>Custom Domain (optional)</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={inputClass}
            placeholder="e.g. reservations.sarovahotels.com"
          />
        </div>
        <div>
          <label className={labelClass}>Logo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            className="block text-[16px] text-dark file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[13px] file:font-semibold file:bg-amber file:text-white hover:file:bg-[#d4911c] file:cursor-pointer"
          />
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <p className="text-[13px] text-red-500 px-1">{error}</p>
      )}

      {result && (
        <div className="rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] p-5 space-y-2">
          <p className="text-[14px] font-semibold text-[#166534]">Partner site created!</p>
          <p className="text-[13px] text-[#166534]">
            Your site is live:{" "}
            <a
              href={result.storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              {result.storefrontUrl}
            </a>
          </p>
          {result.domain && (
            <p className="text-[12px] text-[#166534]/80">
              Point this domain in Vercel + DNS to use the custom domain: <strong>{result.domain}</strong>
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={
            loading ||
            !name.trim() ||
            !slug.trim() ||
            (mode === "create" && (!hostEmail.trim() || !listingId))
          }
          className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors disabled:opacity-50"
        >
          {loading
            ? mode === "create" ? "Creating..." : "Saving..."
            : mode === "create" ? "Create Partner Site" : "Save Changes"}
        </button>
        <a
          href="/admin/partners"
          className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
