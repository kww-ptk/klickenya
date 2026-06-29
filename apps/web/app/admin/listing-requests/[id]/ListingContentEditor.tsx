"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LISTING_TYPES = ["stay", "experience", "event", "service", "rental", "restaurant"];

interface ListingContentEditorProps {
  id: string;
  draftTitle: string;
  draftCity: string;
  listingType: string;
  draftSubcategory: string;
  businessName: string;
  draftWebsite: string;
  draftInstagram: string;
  draftPhone: string;
  draftEmail: string;
  draftDescription: string;
}

function ReadField({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div>
      <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-1">{label}</p>
      {isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-[14px] text-amber hover:underline break-all">
          {value}
        </a>
      ) : (
        <p className="text-[14px] text-dark">{value || "—"}</p>
      )}
    </div>
  );
}

export function ListingContentEditor(props: ListingContentEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState(props.draftTitle);
  const [draftCity, setDraftCity] = useState(props.draftCity);
  const [listingType, setListingType] = useState(props.listingType);
  const [draftSubcategory, setDraftSubcategory] = useState(props.draftSubcategory);
  const [businessName, setBusinessName] = useState(props.businessName);
  const [draftWebsite, setDraftWebsite] = useState(props.draftWebsite);
  const [draftInstagram, setDraftInstagram] = useState(props.draftInstagram);
  const [draftPhone, setDraftPhone] = useState(props.draftPhone);
  const [draftEmail, setDraftEmail] = useState(props.draftEmail);
  const [draftDescription, setDraftDescription] = useState(props.draftDescription);

  // Sync inputs from the latest props (props refresh after router.refresh()).
  function syncFromProps() {
    setDraftTitle(props.draftTitle);
    setDraftCity(props.draftCity);
    setListingType(props.listingType);
    setDraftSubcategory(props.draftSubcategory);
    setBusinessName(props.businessName);
    setDraftWebsite(props.draftWebsite);
    setDraftInstagram(props.draftInstagram);
    setDraftPhone(props.draftPhone);
    setDraftEmail(props.draftEmail);
    setDraftDescription(props.draftDescription);
    setError(null);
  }

  function startEdit() {
    syncFromProps();
    setEditing(true);
  }

  function cancel() {
    syncFromProps();
    setEditing(false);
  }

  async function save() {
    if (!draftTitle.trim()) {
      setError("Title is required.");
      return;
    }
    if (!LISTING_TYPES.includes(listingType)) {
      setError("Pick a valid type.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/listing-requests/${props.id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftTitle,
          draftCity,
          listingType,
          draftSubcategory,
          businessName,
          draftWebsite,
          draftInstagram,
          draftPhone,
          draftEmail,
          draftDescription,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 text-[14px] rounded-xl border border-[#F0EDE8] bg-[#F7F5F2] text-dark focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber";
  const labelCls = "block text-[12px] text-text3 uppercase tracking-wider font-medium mb-1";

  return (
    <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-display font-bold text-dark">Listing Content</h2>
        {!editing && (
          <button
            onClick={startEdit}
            className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-amber/10 text-amber hover:bg-amber/20 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Draft Title</label>
              <input className={inputCls} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={draftCity} onChange={(e) => setDraftCity(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={listingType} onChange={(e) => setListingType(e.target.value)}>
                {LISTING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Subcategory</label>
              <input className={inputCls} value={draftSubcategory} onChange={(e) => setDraftSubcategory(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Business Name</label>
              <input className={inputCls} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input className={inputCls} value={draftWebsite} onChange={(e) => setDraftWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>Instagram</label>
              <input className={inputCls} value={draftInstagram} onChange={(e) => setDraftInstagram(e.target.value)} placeholder="handle" />
            </div>
            <div>
              <label className={labelCls}>Business Phone</label>
              <input className={inputCls} value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Business Email</label>
              <input className={inputCls} value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={5}
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
            />
          </div>
          {error && <p className="text-[13px] text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={loading}
              className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-amber text-white hover:bg-[#C78A1A] transition-colors disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={cancel}
              disabled={loading}
              className="px-4 py-2 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-text3 hover:bg-[#F5F3F0] transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ReadField label="Draft Title" value={props.draftTitle} />
            <ReadField label="City" value={props.draftCity} />
            <ReadField label="Type" value={props.listingType} />
            <ReadField label="Subcategory" value={props.draftSubcategory} />
            <ReadField label="Business Name" value={props.businessName} />
            <ReadField label="Website" value={props.draftWebsite} isLink />
            <ReadField label="Instagram" value={props.draftInstagram ? `@${props.draftInstagram}` : ""} />
            <ReadField label="Business Phone" value={props.draftPhone} />
            <ReadField label="Business Email" value={props.draftEmail} />
          </div>
          {props.draftDescription && (
            <div>
              <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-2">Description</p>
              <div className="bg-[#F7F5F2] rounded-xl p-4 text-[14px] text-dark leading-relaxed whitespace-pre-wrap">
                {props.draftDescription}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
