# Admin Create-Host Guest→Host Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an admin creates a host with an email that already belongs to a guest, offer to upgrade that guest to a host (reusing the claim-approval upgrade logic) instead of failing; after upgrading, the admin lands on the host's page to assign listings.

**Architecture:** Extract the claim-approve guest→host steps into a shared `upgradeGuestToHost()` helper (single source of truth), refactor the claim-approve route to call it, add email detection to the create route (returns `409 {conflict}` instead of a hard error), add an admin-gated upgrade endpoint, and handle the conflict in `HostFormModal` with an inline "Upgrade to host" panel.

**Tech Stack:** Next.js 15 App Router, Supabase service-role `adminClient` (has `auth.admin`), TailwindCSS. No test framework — verify via `npx tsc --noEmit` + ESLint + preview.

**Spec:** `docs/superpowers/specs/2026-06-29-admin-create-host-guest-upgrade-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/lib/admin/upgradeGuestToHost.ts` | Create | Shared guest→host upgrade (role flip + host_profiles), idempotent |
| `apps/web/app/api/admin/claims/[id]/approve/route.ts` | Modify | Refactor the `existingUser` branch to call the helper |
| `apps/web/app/api/admin/hosts/upgrade/route.ts` | Create | Admin-gated upgrade endpoint |
| `apps/web/app/api/admin/hosts/create/route.ts` | Modify | Detect existing email → `409 {conflict}` |
| `apps/web/app/admin/hosts/HostFormModal.tsx` | Modify | Conflict handling + "Upgrade to host" panel |

**Verification (from `apps/web` after each task):** `npx tsc --noEmit` → no output, exit 0.

---

## Task 1: Shared `upgradeGuestToHost` helper

**Files:**
- Create: `apps/web/lib/admin/upgradeGuestToHost.ts`

- [ ] **Step 1: Create the helper**

```ts
import { adminClient } from "@/lib/supabase/admin";

export interface UpgradeGuestToHostInput {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  websiteUrl?: string | null;
  socialUrl?: string | null;
  claimRequestId?: string | null;
  ghlContactId?: string | null;
}

export interface UpgradeGuestToHostResult {
  userId: string;
  hostId: string;
  slug: string;
}

function baseSlugFrom(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Promote an existing guest auth user to host: flip the role on auth.users
 * metadata and public.users, and create their host_profiles row. Preserves
 * credentials and history — no password change, no email. Idempotent: if a
 * host_profiles row already exists for the user it is returned as-is (and role
 * is still ensured to be host).
 *
 * This is the exact logic from the claim-approval flow (the existingUser
 * branch), extracted so both call sites share one implementation.
 */
export async function upgradeGuestToHost(
  input: UpgradeGuestToHostInput
): Promise<UpgradeGuestToHostResult> {
  const {
    userId,
    name,
    email,
    phone,
    city,
    websiteUrl,
    socialUrl,
    claimRequestId,
    ghlContactId,
  } = input;

  // Idempotent guard — already has a host profile.
  const { data: existing } = await adminClient
    .from("host_profiles")
    .select("id, slug")
    .eq("user_id", userId)
    .maybeSingle();

  // Always ensure the role is host (cheap; covers the pre-existing-profile case).
  await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { role: "host", name },
  });
  await adminClient.from("users").update({ role: "host" }).eq("id", userId);

  if (existing) {
    return { userId, hostId: existing.id, slug: existing.slug };
  }

  // Unique slug.
  const base = baseSlugFrom(name);
  let slug = base;
  const { count } = await adminClient
    .from("host_profiles")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug);
  if ((count ?? 0) > 0) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: profile, error: profileErr } = await adminClient
    .from("host_profiles")
    .insert({
      user_id: userId,
      slug,
      display_name: name,
      email,
      phone: phone ?? null,
      city: city ?? null,
      website_url: websiteUrl ?? null,
      social_url: socialUrl ?? null,
      claim_request_id: claimRequestId ?? null,
      ghl_contact_id: ghlContactId ?? null,
    })
    .select("id")
    .single();

  if (profileErr || !profile) {
    throw new Error(profileErr?.message ?? "Failed to create host profile");
  }

  return { userId, hostId: profile.id, slug };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add apps/web/lib/admin/upgradeGuestToHost.ts
git commit -m "feat(host-upgrade): shared guest-to-host upgrade helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Refactor claim-approve to use the helper

Behavior-preserving: the inline `existingUser` (guest) branch is replaced by a call to the helper.

**Files:**
- Modify: `apps/web/app/api/admin/claims/[id]/approve/route.ts`

- [ ] **Step 1: Add the import**

After the existing import line:
```ts
import { updateOpportunityStage, GHL_STAGES } from "@/lib/integrations/ghl";
```
add:
```ts
import { upgradeGuestToHost } from "@/lib/admin/upgradeGuestToHost";
```

- [ ] **Step 2: Replace the inline guest branch**

Replace this entire block:
```ts
      } else if (existingUser) {
        // Existing guest user — promote to host
        userId = existingUser.id;
        isNewHost = true;

        // Update role to host
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role: "host", name: claim.claimant_name },
        });
        await supabase
          .from("users")
          .update({ role: "host" })
          .eq("id", userId);

        // Generate unique slug
        const baseSlug = claim.claimant_name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-");

        let slug = baseSlug;
        const { count } = await supabase
          .from("host_profiles")
          .select("id", { count: "exact", head: true })
          .eq("slug", slug);

        if ((count ?? 0) > 0) {
          slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        }

        // Create host profile for existing user
        const { error: profileErr } = await supabase
          .from("host_profiles")
          .insert({
            user_id: userId,
            slug,
            display_name: claim.claimant_name,
            email: claim.claimant_email,
            phone: claim.claimant_phone,
            city: claim.listing_city ?? null,
            website_url: claim.website_url ?? null,
            social_url: claim.social_media_url ?? null,
            claim_request_id: id,
            ghl_contact_id: claim.ghl_contact_id ?? null,
          });

        if (profileErr) {
          console.error("Host profile insert error:", profileErr);
        }
      } else {
```
with:
```ts
      } else if (existingUser) {
        // Existing guest user — promote to host (shared upgrade logic)
        const upgraded = await upgradeGuestToHost({
          userId: existingUser.id,
          name: claim.claimant_name,
          email: claim.claimant_email,
          phone: claim.claimant_phone,
          city: claim.listing_city ?? null,
          websiteUrl: claim.website_url ?? null,
          socialUrl: claim.social_media_url ?? null,
          claimRequestId: id,
          ghlContactId: claim.ghl_contact_id ?? null,
        });
        userId = upgraded.userId;
        isNewHost = true;
      } else {
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0. (No unused-var errors — the removed block's locals are gone.)

- [ ] **Step 4: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add "apps/web/app/api/admin/claims/[id]/approve/route.ts"
git commit -m "refactor(claim): claim-approve uses shared upgradeGuestToHost

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Upgrade endpoint

**Files:**
- Create: `apps/web/app/api/admin/hosts/upgrade/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { upgradeGuestToHost } from "@/lib/admin/upgradeGuestToHost";

export async function POST(request: NextRequest) {
  try {
    await assertAdmin(request);
    const { email, name, phone } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    const { data: existing } = await adminClient
      .from("users")
      .select("id, role")
      .eq("email", email)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "No account found for that email" },
        { status: 404 }
      );
    }
    if (existing.role === "admin") {
      return NextResponse.json(
        { error: "Admin accounts can't be hosts" },
        { status: 409 }
      );
    }

    const result = await upgradeGuestToHost({
      userId: existing.id,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: (phone ? String(phone) : "").trim() || null,
    });

    revalidatePath("/admin/hosts");
    return NextResponse.json({
      success: true,
      hostId: result.hostId,
      slug: result.slug,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Upgrade host error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add apps/web/app/api/admin/hosts/upgrade/route.ts
git commit -m "feat(host-upgrade): admin upgrade-to-host endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Create route — detect existing email

**Files:**
- Modify: `apps/web/app/api/admin/hosts/create/route.ts`

- [ ] **Step 1: Add the adminClient import**

Replace:
```ts
import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createHostAccount } from "@/lib/admin/createHost";
```
with:
```ts
import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createHostAccount } from "@/lib/admin/createHost";
```

- [ ] **Step 2: Insert the detection before `createHostAccount`**

Replace:
```ts
    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const { hostId, slug } = await createHostAccount({
```
with:
```ts
    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // If the email already belongs to an account, branch on its role instead of
    // failing: a guest can be upgraded to host, a host already exists, and an
    // admin can't become a host.
    const { data: existing } = await adminClient
      .from("users")
      .select("id, role")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      if (existing.role === "admin") {
        return NextResponse.json({ conflict: "admin" }, { status: 409 });
      }
      const { data: existingHost } = await adminClient
        .from("host_profiles")
        .select("id")
        .eq("user_id", existing.id)
        .maybeSingle();
      if (existing.role === "host" || existingHost) {
        return NextResponse.json(
          { conflict: "host", hostId: existingHost?.id ?? null },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { conflict: "guest", email, name, userId: existing.id },
        { status: 409 }
      );
    }

    const { hostId, slug } = await createHostAccount({
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add "apps/web/app/api/admin/hosts/create/route.ts"
git commit -m "feat(host-upgrade): detect existing email in create-host (409 conflict)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: HostFormModal — conflict handling + upgrade panel

**Files:**
- Modify: `apps/web/app/admin/hosts/HostFormModal.tsx`

- [ ] **Step 1: Add conflict state**

Replace:
```tsx
  const [success, setSuccess] = useState(false);
  const router = useRouter();
```
with:
```tsx
  const [success, setSuccess] = useState(false);
  const [conflict, setConflict] = useState<
    | { type: "guest"; email: string; name: string }
    | { type: "host"; hostId: string | null }
    | { type: "admin" }
    | null
  >(null);
  const router = useRouter();
```

- [ ] **Step 2: Clear conflict in `reset`**

Replace:
```tsx
  function reset() {
    setName(initialName);
    setEmail(initialEmail);
    setPhone(initialPhone);
    setPassword("");
    setError(null);
  }
```
with:
```tsx
  function reset() {
    setName(initialName);
    setEmail(initialEmail);
    setPhone(initialPhone);
    setPassword("");
    setError(null);
    setConflict(null);
  }
```

- [ ] **Step 3: Handle the 409 conflict in `handleSubmit`**

Replace:
```tsx
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
```
with:
```tsx
      const data = await res.json();
      if (!res.ok) {
        if (mode === "create" && data.conflict === "guest") {
          setConflict({
            type: "guest",
            email: data.email ?? email.trim(),
            name: data.name ?? name.trim(),
          });
          return;
        }
        if (mode === "create" && data.conflict === "host") {
          setConflict({ type: "host", hostId: data.hostId ?? null });
          return;
        }
        if (mode === "create" && data.conflict === "admin") {
          setConflict({ type: "admin" });
          return;
        }
        throw new Error(data.error ?? "Failed");
      }
```

- [ ] **Step 4: Add the upgrade handler**

Immediately after the closing brace of `handleSubmit`, add:
```tsx

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hosts/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upgrade failed");
      setOpen(false);
      router.push(`/admin/hosts/${data.hostId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setLoading(false);
    }
  }
```

- [ ] **Step 5: Render the conflict panel (wrap the form body)**

Replace the entire form body — from the opening `<div className="space-y-3">` through the actions row that ends just before the modal's closing `</div></div>`. Specifically, replace this block:
```tsx
            <div className="space-y-3">
              <Field label="Name *">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Email *">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="email@example.com"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="+254..."
                />
              </Field>
              <Field label={mode === "create" ? "Password *" : "New Password"}>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={
                    mode === "create"
                      ? "Min 8 characters"
                      : "Leave blank to keep current"
                  }
                />
                {password !== "" && password.length < 8 && (
                  <p className="mt-1 text-[12px] text-red-500">
                    At least 8 characters.
                  </p>
                )}
              </Field>
            </div>

            {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}
            {success && (
              <p className="mt-3 text-[13px] text-[#22C55E] font-medium">
                {mode === "create"
                  ? "Host created! Welcome email sent."
                  : "Host updated."}
              </p>
            )}

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : mode === "create"
                    ? "Create Host"
                    : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
              >
                Cancel
              </button>
            </div>
```
with:
```tsx
            {conflict ? (
              <div>
                {conflict.type === "guest" && (
                  <>
                    <p className="text-[14px] text-dark mb-2">
                      <strong>{conflict.email}</strong> already belongs to a guest account.
                    </p>
                    <p className="text-[13px] text-text3 mb-5">
                      Upgrade {conflict.name || "this guest"} to a host? They keep their
                      existing login and history — only their role changes.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleUpgrade}
                        disabled={loading}
                        className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors disabled:opacity-50"
                      >
                        {loading ? "Upgrading..." : "Upgrade to host"}
                      </button>
                      <button
                        onClick={() => setConflict(null)}
                        className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </>
                )}
                {conflict.type === "host" && (
                  <>
                    <p className="text-[14px] text-dark mb-2">
                      This email is already a host.
                    </p>
                    <p className="text-[13px] text-text3 mb-5">
                      You can assign listings to them from their profile.
                    </p>
                    <div className="flex items-center gap-3">
                      {conflict.hostId && (
                        <button
                          onClick={() => {
                            setOpen(false);
                            router.push(`/admin/hosts/${conflict.hostId}`);
                          }}
                          className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors"
                        >
                          Open host →
                        </button>
                      )}
                      <button
                        onClick={() => setConflict(null)}
                        className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </>
                )}
                {conflict.type === "admin" && (
                  <>
                    <p className="text-[14px] text-dark mb-2">
                      This email belongs to an admin account.
                    </p>
                    <p className="text-[13px] text-text3 mb-5">
                      Admin accounts can&apos;t be converted to hosts.
                    </p>
                    <button
                      onClick={() => setConflict(null)}
                      className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
                    >
                      Back
                    </button>
                  </>
                )}
                {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Field label="Name *">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Email *">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="email@example.com"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="+254..."
                    />
                  </Field>
                  <Field label={mode === "create" ? "Password *" : "New Password"}>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder={
                        mode === "create"
                          ? "Min 8 characters"
                          : "Leave blank to keep current"
                      }
                    />
                    {password !== "" && password.length < 8 && (
                      <p className="mt-1 text-[12px] text-red-500">
                        At least 8 characters.
                      </p>
                    )}
                  </Field>
                </div>

                {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}
                {success && (
                  <p className="mt-3 text-[13px] text-[#22C55E] font-medium">
                    {mode === "create"
                      ? "Host created! Welcome email sent."
                      : "Host updated."}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : mode === "create"
                        ? "Create Host"
                        : "Save Changes"}
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      reset();
                    }}
                    className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
```

- [ ] **Step 6: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add apps/web/app/admin/hosts/HostFormModal.tsx
git commit -m "feat(host-upgrade): create modal offers guest-to-host upgrade

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 2: Lint touched paths**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx eslint lib/admin/upgradeGuestToHost.ts "app/api/admin/hosts/upgrade" "app/api/admin/hosts/create" "app/api/admin/claims/[id]/approve" app/admin/hosts/HostFormModal.tsx`
Expected: no errors on the new/changed files.

- [ ] **Step 3: Manual verification via preview**

Signed in as an admin, on `/admin/hosts`:
1. **New email → creates host** (unchanged): "+ Create Host" with a brand-new email + 8-char password → success.
2. **Guest email → upgrade panel:** enter the email of a known guest account → the modal swaps to "… already belongs to a guest account. Upgrade …" → click **Upgrade to host** → redirected to `/admin/hosts/[hostId]`; the host now appears in the hosts list; the guest's login still works (role flipped, no new password).
3. **Host email → already-host panel:** enter an existing host's email → "This email is already a host" with **Open host →**.
4. **Claim-approval regression:** approve a claim submitted by a signed-in guest → the guest is still upgraded to host correctly (same behavior as before the refactor).

- [ ] **Step 4: Capture proof**

preview_screenshot the upgrade panel and the post-upgrade host page; preview_network to confirm `/api/admin/hosts/create` returns 409 `{conflict:"guest"}` and `/api/admin/hosts/upgrade` returns 200.

---

## Self-Review Notes

- **Spec coverage:** shared helper (Task 1) ✓; claim-approve refactor / single source of truth (Task 2) ✓; create-route email detection + role branch (Task 4) ✓; upgrade endpoint (Task 3) ✓; modal conflict UI + redirect-to-assign (Task 5) ✓; no password / no email / preserves credentials (Task 1 — only role flip + profile insert) ✓; existing-host = inform + link (Task 5 host panel) ✓.
- **Type consistency:** `upgradeGuestToHost`'s `UpgradeGuestToHostInput`/`Result` (Task 1) are consumed verbatim in Tasks 2 and 3; the create route's `409 {conflict, email, name, hostId}` shape (Task 4) matches exactly what `HostFormModal` reads (Task 5); the upgrade endpoint's `{hostId, slug}` response matches `handleUpgrade`'s `data.hostId` use.
- **No placeholders:** every step has complete code.
- **Deviation from TDD:** repo has no test framework; verification is typecheck + lint + preview (Task 6), consistent with the codebase.
