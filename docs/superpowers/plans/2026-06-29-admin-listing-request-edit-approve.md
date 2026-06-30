# Admin Listing-Request Edit + Approve-Anytime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin approve/reject a listing submission at any time (even after a reply or rejection) and edit the submission's core content before approving.

**Architecture:** Relax the detail page's approve/reject gating (the approve route already supports approving any non-approved request). Add a `PATCH …/draft` endpoint and an inline `ListingContentEditor` client component so the admin edits the `draft_*` columns the approve route reads.

**Tech Stack:** Next.js 15 App Router, Supabase service-role `adminClient`, TailwindCSS. No test framework — verify via `npx tsc --noEmit` + ESLint + preview.

**Spec:** `docs/superpowers/specs/2026-06-29-admin-listing-request-edit-approve-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/app/api/admin/listing-requests/[id]/draft/route.ts` | Create | `PATCH` — update the 10 core draft fields |
| `apps/web/app/admin/listing-requests/[id]/ListingContentEditor.tsx` | Create | Inline view/edit of the listing content |
| `apps/web/app/admin/listing-requests/[id]/page.tsx` | Modify | Relax approve/reject gating; render the editor |

**Verification (from `apps/web` after each task):** `npx tsc --noEmit` → no output, exit 0.

---

## Task 1: Draft edit endpoint

**Files:**
- Create: `apps/web/app/api/admin/listing-requests/[id]/draft/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";

const VALID_TYPES = ["stay", "experience", "event", "service", "rental", "restaurant"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const draftTitle = String(body.draftTitle ?? "").trim();
    const listingType = String(body.listingType ?? "").trim();

    if (!draftTitle) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(listingType)) {
      return NextResponse.json({ error: "Invalid listing type" }, { status: 400 });
    }

    const text = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s.length ? s : null;
    };

    const { error } = await adminClient
      .from("listing_requests")
      .update({
        draft_title: draftTitle,
        listing_type: listingType,
        draft_city: text(body.draftCity),
        draft_subcategory: text(body.draftSubcategory),
        business_name: text(body.businessName),
        draft_description: text(body.draftDescription),
        draft_website: text(body.draftWebsite),
        draft_instagram: text(body.draftInstagram),
        draft_phone: text(body.draftPhone),
        draft_email: text(body.draftEmail),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath(`/admin/listing-requests/${id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Listing-request draft update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add "apps/web/app/api/admin/listing-requests/[id]/draft/route.ts"
git commit -m "feat(listing-requests): PATCH endpoint to edit submission draft

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Inline content editor component

**Files:**
- Create: `apps/web/app/admin/listing-requests/[id]/ListingContentEditor.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add "apps/web/app/admin/listing-requests/[id]/ListingContentEditor.tsx"
git commit -m "feat(listing-requests): inline content editor component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Wire into the detail page (gating + editor)

**Files:**
- Modify: `apps/web/app/admin/listing-requests/[id]/page.tsx`

- [ ] **Step 1: Add the editor import**

Replace:
```tsx
import { ListingRequestActions } from "./ListingRequestActions";
```
with:
```tsx
import { ListingRequestActions } from "./ListingRequestActions";
import { ListingContentEditor } from "./ListingContentEditor";
```

- [ ] **Step 2: Relax the approve/reject gating**

Replace:
```tsx
  const canApprove = request.status === "submitted" || request.status === "new";
  const canReject = request.status !== "rejected" && request.status !== "approved";
```
with:
```tsx
  // Approve/Reject available in any state except a final "approved" (the approve
  // route is idempotent and 409s on re-approval; this just lets the admin act on
  // a request after a reply, status change, or rejection).
  const canApprove = request.status !== "approved";
  const canReject = request.status !== "approved";
```

- [ ] **Step 3: Replace the read-only Listing Content block with the editor**

Replace this entire block:
```tsx
          {/* Listing Content */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
            <h2 className="text-[18px] font-display font-bold text-dark">
              Listing Content
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Draft Title" value={request.draft_title} />
              <Field label="City" value={request.draft_city || request.location} />
              <Field label="Type" value={request.listing_type} />
              <Field label="Subcategory" value={request.draft_subcategory} />
              <Field label="Business Name" value={request.business_name} />
              {request.draft_website && (
                <div>
                  <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-1">
                    Website
                  </p>
                  <a
                    href={request.draft_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-amber hover:underline break-all"
                  >
                    {request.draft_website}
                  </a>
                </div>
              )}
              {request.draft_instagram && (
                <Field label="Instagram" value={`@${request.draft_instagram}`} />
              )}
              {request.draft_phone && (
                <Field label="Business Phone" value={request.draft_phone} />
              )}
              {request.draft_email && (
                <Field label="Business Email" value={request.draft_email} />
              )}
            </div>

            {(request.draft_description || request.description) && (
              <div>
                <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-2">
                  Description
                </p>
                <div className="bg-[#F7F5F2] rounded-xl p-4 text-[14px] text-dark leading-relaxed whitespace-pre-wrap">
                  {request.draft_description || request.description}
                </div>
              </div>
            )}
          </div>
```
with:
```tsx
          {/* Listing Content (inline editable) */}
          <ListingContentEditor
            id={id}
            draftTitle={request.draft_title || ""}
            draftCity={request.draft_city || request.location || ""}
            listingType={request.listing_type || ""}
            draftSubcategory={request.draft_subcategory || ""}
            businessName={request.business_name || ""}
            draftWebsite={request.draft_website || ""}
            draftInstagram={request.draft_instagram || ""}
            draftPhone={request.draft_phone || ""}
            draftEmail={request.draft_email || ""}
            draftDescription={request.draft_description || request.description || ""}
          />
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx eslint "app/admin/listing-requests/[id]"`
Expected: no errors. (The `Field` helper remains used by the Submitter Details section, so it is not orphaned.)

- [ ] **Step 5: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add "apps/web/app/admin/listing-requests/[id]/page.tsx"
git commit -m "feat(listing-requests): approve/reject anytime + inline content editor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 2: Lint touched paths**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx eslint "app/admin/listing-requests/[id]" "app/api/admin/listing-requests/[id]/draft"`
Expected: no errors on the new/changed files.

- [ ] **Step 3: Manual verification via preview**

Signed in as admin, open a listing request at `/admin/listing-requests/[id]`:
1. **Edit:** click **Edit** on Listing Content → change Title and Description → **Save changes** → values persist after refresh.
2. **Approve after reject:** click **Reject** → the **Decision** panel (Approve/Reject) is still shown → click **Approve** → listing is created/published in Sanity with the edited content; status becomes `approved`.
3. **Approved is terminal:** on an already-approved request, the Approve/Reject panel is hidden.
4. **Mark Responded → Approve still available:** "Mark Responded" then confirm Approve is still present.

- [ ] **Step 4: Capture proof**

preview_screenshot the editor in edit mode and the Decision panel visible on a rejected request; preview_network to confirm `PATCH …/draft` returns 200 and the approve call succeeds from a rejected state.

---

## Self-Review Notes

- **Spec coverage:** approve/reject anytime (Task 3 gating) ✓; edit core content (Task 1 endpoint + Task 2 editor + Task 3 wiring) ✓; no migration (existing columns) ✓; approve reads edited draft_* (unchanged approve route) ✓; re-approval blocked (route 409 + page hides at `approved`) ✓.
- **Type consistency:** `ListingContentEditorProps` (Task 2) is passed exactly by Task 3; the editor's PATCH body keys (`draftTitle`, `draftCity`, `listingType`, `draftSubcategory`, `businessName`, `draftWebsite`, `draftInstagram`, `draftPhone`, `draftEmail`, `draftDescription`) match the endpoint's `body.*` reads (Task 1).
- **No placeholders:** every step has complete code.
- **Deviation from TDD:** no test framework; verification is typecheck + lint + preview (Task 4).
