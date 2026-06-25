# Admin Host Management (Edit / Delete / Set Password) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin set a password when creating a host, and edit (name/email/phone/password) or delete any host from the admin host pages.

**Architecture:** Mirror the existing `createHost` pattern — thin `assertAdmin`-gated REST route handlers + server-side lib functions + client modals. Shared Sanity-listing operations are extracted into one helper module. Email changes propagate across auth, `public.users`, `host_profiles`, the Sanity host doc, and `notificationEmail1` on assigned listings. Deletion auto-unassigns listings then removes the account in FK-safe order.

**Tech Stack:** Next.js 15 App Router, Supabase (`@supabase/supabase-js` service-role admin API + PostgREST via `adminClient`), Sanity (`sanityWriteClient` / `sanityPreviewClient`), Resend, TailwindCSS. No test framework exists in this repo; verification is `npx tsc --noEmit` + `eslint` + preview-based manual checks.

**Spec:** `docs/superpowers/specs/2026-06-25-admin-host-management-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/lib/email/hostEmails.ts` | Modify (append only) | 6 new email templates; existing templates untouched |
| `apps/web/lib/admin/hostListings.ts` | Create | Host↔Sanity-listing ops: fetch assigned, unassign one, bulk-set notificationEmail1 |
| `apps/web/app/api/admin/hosts/[id]/unassign/route.ts` | Modify | Refactor to call the shared unassign helper |
| `apps/web/lib/admin/createHost.ts` | Modify | Accept optional admin-set password; credentials email when set, magic-link otherwise |
| `apps/web/app/api/admin/hosts/create/route.ts` | Modify | Require + validate password |
| `apps/web/lib/admin/updateHost.ts` | Create | Update name/email/phone/password across all stores + notify |
| `apps/web/lib/admin/deleteHost.ts` | Create | Auto-unassign + FK-safe delete + notify |
| `apps/web/app/api/admin/hosts/[id]/route.ts` | Create | `PATCH` (update) + `DELETE` |
| `apps/web/app/admin/hosts/HostFormModal.tsx` | Create | Shared create/edit modal |
| `apps/web/app/admin/hosts/CreateHostModal.tsx` | Delete | Replaced by HostFormModal |
| `apps/web/app/admin/hosts/page.tsx` | Modify | Use HostFormModal for create |
| `apps/web/app/admin/hosts/DeleteHostButton.tsx` | Create | Typed-confirmation delete dialog |
| `apps/web/app/admin/hosts/[id]/page.tsx` | Modify | Render Edit + Delete in Section A |

**Verification command (run from `apps/web` after each task):** `npx tsc --noEmit` → expect no output, exit 0.

---

## Task 1: Email templates

**Files:**
- Modify: `apps/web/lib/email/hostEmails.ts` (append new functions at end; do not change existing ones)

- [ ] **Step 1: Append the six new templates to the end of the file**

```ts
// Email 7 — TO NEW HOST: Account created with an admin-set password
export function hostWelcomeWithPasswordHtml(p: {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Welcome to Klickenya</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.name},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">Your Klickenya host account has been created. Use these credentials to sign in:</p>
    <div style="margin:16px 0;padding:16px;background:#F5F3F0;border-radius:8px;">
      <p style="margin:0;font-size:13px;color:#9C9485;">Email</p>
      <p style="margin:4px 0 12px;font-size:15px;font-weight:600;color:#16130C;">${p.email}</p>
      <p style="margin:0;font-size:13px;color:#9C9485;">Temporary password</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#16130C;">${p.password}</p>
    </div>
    <p style="font-size:14px;color:#333;line-height:1.6;">Please sign in and change your password from your account settings.</p>
    ${cta("Sign In", p.loginUrl)}
    <p style="margin-top:24px;font-size:14px;color:#333;line-height:1.6;"><strong>What's next:</strong> Complete your host profile, and we'll assign your listings shortly.</p>
  `);
}

// Email 8 — TO HOST: Login email changed
export function hostEmailChangedHtml(p: {
  name: string;
  newEmail: string;
  loginUrl: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Your login email has changed</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.name},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">The email on your Klickenya host account was updated by an administrator. You now sign in with:</p>
    <div style="margin:16px 0;padding:16px;background:#F5F3F0;border-radius:8px;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#16130C;">${p.newEmail}</p>
    </div>
    <p style="font-size:14px;color:#333;line-height:1.6;">If you did not expect this change, reply to this email right away.</p>
    ${cta("Go to Login", p.loginUrl)}
  `);
}

// Email 9 — TO HOST: Password changed
export function hostPasswordChangedHtml(p: {
  name: string;
  loginUrl: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Your password has changed</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.name},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">The password on your Klickenya host account was reset by an administrator. Contact your administrator for the new password, then sign in and change it from your account settings.</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">If you did not expect this change, reply to this email right away.</p>
    ${cta("Go to Login", p.loginUrl)}
  `);
}

// Email 10 — TO HOST: Account deleted
export function hostDeletedHtml(p: { name: string }): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Your host account has been closed</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.name},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">Your Klickenya host account has been closed by an administrator and you no longer have dashboard access.</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">If you believe this was a mistake, reply to this email and we'll help.</p>
  `);
}

// Email 11 — TO ADMIN: Host updated (confirmation)
export function hostUpdatedToAdminHtml(p: {
  name: string;
  email: string;
  changes: string[];
  hostProfileId: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Host Updated</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Host <strong>${p.name}</strong> (${p.email}) was updated via the admin panel.</p>
    <p style="font-size:13px;color:#9C9485;">Changed: ${p.changes.length ? p.changes.join(", ") : "—"}</p>
    <p style="font-size:13px;color:#9C9485;">Timestamp: ${new Date().toISOString()}</p>
    ${cta("View Host", `https://klickenya.com/admin/hosts/${p.hostProfileId}`)}
  `);
}

// Email 12 — TO ADMIN: Host deleted (confirmation)
export function hostDeletedToAdminHtml(p: { name: string; email: string }): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Host Deleted</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Host <strong>${p.name}</strong> (${p.email}) was permanently deleted via the admin panel. Their listings were unassigned and remain live.</p>
    <p style="font-size:13px;color:#9C9485;">Timestamp: ${new Date().toISOString()}</p>
  `);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/email/hostEmails.ts
git commit -m "feat(admin-hosts): add host edit/delete/welcome email templates

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Shared host-listing helper

Extracts the listing operations both the unassign route and the new delete/update flows need, so they stay DRY. Uses the existing shared `sanityWriteClient` / `sanityPreviewClient` instead of re-instantiating.

**Files:**
- Create: `apps/web/lib/admin/hostListings.ts`

- [ ] **Step 1: Create the helper module**

```ts
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { sanityPreviewClient } from "@/lib/sanity/client";

/** Minimal host shape needed to locate a host's Sanity listings. */
export interface HostRef {
  user_id: string;
  sanity_host_id: string | null;
}

// Three ways a listing links to a host (mirrors the admin host detail page query):
//   1. hostId == user_id              2. host._ref == sanity_host_id
//   3. _id appears in the host doc's listings[] array
const ASSIGNED_QUERY = `*[_type == "listing" && (
  hostId == $hostId
  || host._ref == $sanityHostId
  || (_id in *[_type == "host" && _id == $sanityHostId][0].listings[]._ref)
)]{ _id, title }`;

export async function getAssignedListings(
  host: HostRef
): Promise<{ _id: string; title: string }[]> {
  return sanityPreviewClient.fetch(ASSIGNED_QUERY, {
    hostId: host.user_id,
    sanityHostId: host.sanity_host_id ?? "",
  });
}

/**
 * Detach a single listing from a host: clear host fields, reset notificationEmail1
 * to the admin address, mark unverified, drop the host reference, and remove the
 * listing from the host doc's listings[] array. (No emails — callers handle those.)
 */
export async function unassignListingFromHost(
  host: HostRef,
  sanityId: string
): Promise<void> {
  await sanityWriteClient
    .patch(sanityId)
    .set({
      hostId: "",
      hostName: "",
      notificationEmail1: process.env.ADMIN_EMAIL ?? "",
      isVerified: false,
      verificationStatus: "pending",
    })
    .commit();

  await sanityWriteClient.patch(sanityId).unset(["host"]).commit();

  if (host.sanity_host_id) {
    await sanityWriteClient
      .patch(host.sanity_host_id)
      .unset([`listings[_ref=="${sanityId}"]`])
      .commit()
      .catch((err: unknown) =>
        console.error("Remove listing from host error:", err)
      );
  }
}

/** Point notificationEmail1 on every assigned listing at a new email (best-effort per listing). */
export async function setNotificationEmailForAssignedListings(
  host: HostRef,
  email: string
): Promise<void> {
  const listings = await getAssignedListings(host);
  for (const l of listings) {
    await sanityWriteClient
      .patch(l._id)
      .set({ notificationEmail1: email })
      .commit()
      .catch((err: unknown) =>
        console.error(`Set notificationEmail1 on ${l._id} failed:`, err)
      );
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/admin/hostListings.ts
git commit -m "feat(admin-hosts): extract shared host-listing helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Refactor unassign route to use the helper

Confirms the extracted helper preserves existing behavior before anything depends on it.

**Files:**
- Modify: `apps/web/app/api/admin/hosts/[id]/unassign/route.ts` (replace entire file)

- [ ] **Step 1: Replace the file contents**

```ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { unassignListingFromHost } from "@/lib/admin/hostListings";
import {
  listingUnassignedToHostHtml,
  listingUnassignedToAdminHtml,
} from "@/lib/email/hostEmails";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;
    const { sanityId, listingTitle } = await request.json();

    if (!sanityId) {
      return NextResponse.json({ error: "sanityId is required" }, { status: 400 });
    }

    const { data: host } = await adminClient
      .from("host_profiles")
      .select("id, user_id, display_name, email, sanity_host_id")
      .eq("id", id)
      .single();

    if (!host) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 });
    }

    await unassignListingFromHost(
      { user_id: host.user_id, sanity_host_id: host.sanity_host_id },
      sanityId
    );

    if (host.email) {
      await resend.emails
        .send({
          from: "Klickenya <hello@klickenya.com>",
          to: host.email,
          subject: "A listing has been removed from your Klickenya profile",
          html: listingUnassignedToHostHtml({
            hostName: host.display_name ?? "Host",
            listingTitle: listingTitle ?? "Listing",
          }),
        })
        .catch(() => {});
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await resend.emails
        .send({
          from: "Klickenya <noreply@klickenya.com>",
          to: adminEmail,
          subject: `Admin: Listing unassigned — ${listingTitle}`,
          html: listingUnassignedToAdminHtml({
            listingTitle: listingTitle ?? "Listing",
            hostName: host.display_name ?? "Host",
            hostEmail: host.email ?? "",
          }),
        })
        .catch(() => {});
    }

    revalidatePath(`/admin/hosts/${id}`);
    revalidatePath("/dashboard");

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Unassign listing error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/api/admin/hosts/[id]/unassign/route.ts"
git commit -m "refactor(admin-hosts): unassign route uses shared helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Admin-set password on creation

`createHostAccount` becomes password-aware while keeping the magic-link path for callers that pass no password (white-label partner flow at `apps/web/app/api/admin/partners/route.ts`). The admin create route requires a password.

**Files:**
- Modify: `apps/web/lib/admin/createHost.ts` (replace entire file)
- Modify: `apps/web/app/api/admin/hosts/create/route.ts` (replace entire file)

- [ ] **Step 1: Replace `createHost.ts`**

```ts
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { adminClient } from "@/lib/supabase/admin";
import {
  hostWelcomeHtml,
  hostWelcomeWithPasswordHtml,
  hostCreatedToAdminHtml,
} from "@/lib/email/hostEmails";

export interface CreateHostInput {
  name: string;
  email: string;
  /** Admin-set password. If omitted, a temp password + magic link are generated (partner flow). */
  password?: string | null;
  phone?: string | null;
  partnerId?: string | null; // white-label linkage → host_profiles.partner_id
}

export interface CreateHostResult {
  userId: string;
  hostId: string;
  slug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createHostAccount(
  input: CreateHostInput
): Promise<CreateHostResult> {
  const { name, email, phone, partnerId } = input;

  const adminSetPassword = input.password?.trim() || null;
  // Either the admin-set password, or a generated temp password for the magic-link path.
  const tempPassword =
    adminSetPassword ?? `Welcome${Math.floor(1000 + Math.random() * 9000)}`;
  const slug = slugify(name);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Failed to create user");
  }

  const userId = authData.user.id;

  // auth.admin.createUser() does NOT create a public.users row — upsert it.
  await adminClient
    .from("users")
    .upsert(
      { id: userId, email, full_name: name, role: "host" },
      { onConflict: "id" }
    );

  const { data: hostProfile, error: profileError } = await adminClient
    .from("host_profiles")
    .insert({
      user_id: userId,
      display_name: name,
      email,
      phone: phone ?? null,
      slug,
      password_changed: false,
      partner_id: partnerId ?? null,
    })
    .select("id")
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (adminSetPassword) {
    // Admin set the password — email the credentials, no magic link.
    await resend.emails
      .send({
        from: "Klickenya <hello@klickenya.com>",
        to: email,
        subject: "Welcome to Klickenya — your host account is ready",
        html: hostWelcomeWithPasswordHtml({
          name,
          email,
          password: adminSetPassword,
          loginUrl: `${siteUrl}/login`,
        }),
      })
      .catch((err) => console.error("Welcome email error:", err));
  } else {
    // No password (e.g. white-label partner) — keep the magic-link flow.
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    const magicLink =
      linkData?.properties?.action_link ?? `${siteUrl}/login`;
    await resend.emails
      .send({
        from: "Klickenya <hello@klickenya.com>",
        to: email,
        subject: "Welcome to Klickenya — your host account is ready",
        html: hostWelcomeHtml({ name, email, magicLink }),
      })
      .catch((err) => console.error("Welcome email error:", err));
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await resend.emails
      .send({
        from: "Klickenya <noreply@klickenya.com>",
        to: adminEmail,
        subject: `Admin: New host created — ${name}`,
        html: hostCreatedToAdminHtml({
          name,
          email,
          phone: phone ?? "—",
          slug,
          hostProfileId: hostProfile.id,
        }),
      })
      .catch(() => {});
  }

  return { userId, hostId: hostProfile.id, slug };
}
```

- [ ] **Step 2: Replace `create/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createHostAccount } from "@/lib/admin/createHost";

export async function POST(request: NextRequest) {
  try {
    await assertAdmin(request);
    const { name, email, phone, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email and password are required" },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const { hostId, slug } = await createHostAccount({
      name,
      email,
      phone,
      password,
    });

    return NextResponse.json({ success: true, hostId, slug }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error) {
      console.error("Create host error:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.error("Create host error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Confirm the partner flow still compiles (no change needed)**

Run: `grep -n "createHostAccount" apps/web/app/api/admin/partners/route.ts`
Expected: the existing call (no `password` key) — still valid since `password` is optional.

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/admin/createHost.ts "apps/web/app/api/admin/hosts/create/route.ts"
git commit -m "feat(admin-hosts): admin-set password on host creation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `updateHostAccount` lib

**Files:**
- Create: `apps/web/lib/admin/updateHost.ts`

- [ ] **Step 1: Create the file**

```ts
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { adminClient } from "@/lib/supabase/admin";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { setNotificationEmailForAssignedListings } from "@/lib/admin/hostListings";
import {
  hostEmailChangedHtml,
  hostPasswordChangedHtml,
  hostUpdatedToAdminHtml,
} from "@/lib/email/hostEmails";

/** Thrown when a new email collides with an existing account; mapped to HTTP 409. */
export class HostEmailConflictError extends Error {
  constructor(message = "That email is already in use by another account") {
    super(message);
    this.name = "HostEmailConflictError";
  }
}

export interface UpdateHostInput {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  /** Optional — when present, the auth password is reset to this value. */
  password?: string | null;
}

export async function updateHostAccount(
  input: UpdateHostInput
): Promise<{ success: true }> {
  const { id, name, phone } = input;
  const email = input.email.trim();
  const password = input.password?.trim() || null;

  const { data: host, error: loadErr } = await adminClient
    .from("host_profiles")
    .select("id, user_id, display_name, email, phone, sanity_host_id")
    .eq("id", id)
    .single();

  if (loadErr || !host) {
    throw new Error("Host not found");
  }

  const emailChanged =
    email.toLowerCase() !== (host.email ?? "").toLowerCase();
  const passwordChanged = !!password;
  const nameChanged = name !== host.display_name;
  const phoneChanged = (phone ?? null) !== (host.phone ?? null);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // --- 1. auth.users (email and/or password). Runs first so a colliding
  //         email fails here before any DB rows are touched. ---
  if (emailChanged || passwordChanged) {
    const updates: {
      email?: string;
      password?: string;
      email_confirm?: boolean;
    } = {};
    if (emailChanged) {
      updates.email = email;
      updates.email_confirm = true;
    }
    if (passwordChanged) {
      updates.password = password!;
    }
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      host.user_id,
      updates
    );
    if (authErr) {
      if (/already|registered|exists|duplicate/i.test(authErr.message)) {
        throw new HostEmailConflictError();
      }
      throw new Error(authErr.message);
    }
  }

  // --- 2. public.users ---
  const { error: usersErr } = await adminClient
    .from("users")
    .update({ email, full_name: name })
    .eq("id", host.user_id);
  if (usersErr) {
    if (usersErr.code === "23505") throw new HostEmailConflictError();
    throw new Error(usersErr.message);
  }

  // --- 3. host_profiles ---
  const profileUpdate: Record<string, unknown> = {
    display_name: name,
    email,
    phone: phone ?? null,
  };
  if (passwordChanged) profileUpdate.password_changed = false;

  const { error: profileErr } = await adminClient
    .from("host_profiles")
    .update(profileUpdate)
    .eq("id", id);
  if (profileErr) {
    if (profileErr.code === "23505") throw new HostEmailConflictError();
    throw new Error(profileErr.message);
  }

  // --- 4. Sanity host doc email (best-effort) ---
  if (emailChanged && host.sanity_host_id) {
    await sanityWriteClient
      .patch(host.sanity_host_id)
      .set({ email })
      .commit()
      .catch((err) => console.error("Update Sanity host email error:", err));
  }

  // --- 5. notificationEmail1 on assigned listings (best-effort) ---
  if (emailChanged) {
    await setNotificationEmailForAssignedListings(
      { user_id: host.user_id, sanity_host_id: host.sanity_host_id },
      email
    ).catch((err) =>
      console.error("Update listing notification emails error:", err)
    );
  }

  // --- 6. Notifications ---
  const resend = new Resend(process.env.RESEND_API_KEY);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
  const loginUrl = `${siteUrl}/login`;

  if (emailChanged) {
    await resend.emails
      .send({
        from: "Klickenya <hello@klickenya.com>",
        to: email,
        subject: "Your Klickenya login email has changed",
        html: hostEmailChangedHtml({ name, newEmail: email, loginUrl }),
      })
      .catch(() => {});
  }

  if (passwordChanged) {
    await resend.emails
      .send({
        from: "Klickenya <hello@klickenya.com>",
        to: email,
        subject: "Your Klickenya password has changed",
        html: hostPasswordChangedHtml({ name, loginUrl }),
      })
      .catch(() => {});
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (
    adminEmail &&
    (emailChanged || passwordChanged || nameChanged || phoneChanged)
  ) {
    const changes: string[] = [];
    if (nameChanged) changes.push("name");
    if (emailChanged) changes.push("email");
    if (passwordChanged) changes.push("password");
    if (phoneChanged) changes.push("phone");
    await resend.emails
      .send({
        from: "Klickenya <noreply@klickenya.com>",
        to: adminEmail,
        subject: `Admin: Host updated — ${name}`,
        html: hostUpdatedToAdminHtml({
          name,
          email,
          changes,
          hostProfileId: id,
        }),
      })
      .catch(() => {});
  }

  return { success: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/admin/updateHost.ts
git commit -m "feat(admin-hosts): updateHostAccount across auth/db/sanity

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: `deleteHostAccount` lib

**Files:**
- Create: `apps/web/lib/admin/deleteHost.ts`

- [ ] **Step 1: Create the file**

```ts
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { adminClient } from "@/lib/supabase/admin";
import {
  getAssignedListings,
  unassignListingFromHost,
} from "@/lib/admin/hostListings";
import {
  hostDeletedHtml,
  hostDeletedToAdminHtml,
} from "@/lib/email/hostEmails";

export async function deleteHostAccount(input: {
  id: string;
}): Promise<{ success: true; unassignedCount: number }> {
  const { id } = input;

  const { data: host, error } = await adminClient
    .from("host_profiles")
    .select("id, user_id, display_name, email, sanity_host_id")
    .eq("id", id)
    .single();

  if (error || !host) {
    throw new Error("Host not found");
  }

  const hostRef = {
    user_id: host.user_id,
    sanity_host_id: host.sanity_host_id,
  };

  // 1. Auto-unassign every assigned listing (best-effort per listing).
  const listings = await getAssignedListings(hostRef).catch(() => []);
  for (const l of listings) {
    await unassignListingFromHost(hostRef, l._id).catch((err) =>
      console.error(`Unassign ${l._id} during delete failed:`, err)
    );
  }

  // 2. host_profiles — FK to auth.users with no cascade, so delete before the auth user.
  const { error: profileErr } = await adminClient
    .from("host_profiles")
    .delete()
    .eq("id", id);
  if (profileErr) throw new Error(profileErr.message);

  // 3. public.users — FK to auth.users with no cascade.
  const { error: usersErr } = await adminClient
    .from("users")
    .delete()
    .eq("id", host.user_id);
  if (usersErr) throw new Error(usersErr.message);

  // 4. auth user — last; cascades ON DELETE CASCADE children (properties, kitchen, etc.).
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(
    host.user_id
  );
  if (authErr) throw new Error(authErr.message);

  // 5. Notifications (host.email captured before deletion).
  const resend = new Resend(process.env.RESEND_API_KEY);
  if (host.email) {
    await resend.emails
      .send({
        from: "Klickenya <hello@klickenya.com>",
        to: host.email,
        subject: "Your Klickenya host account has been closed",
        html: hostDeletedHtml({ name: host.display_name ?? "Host" }),
      })
      .catch(() => {});
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await resend.emails
      .send({
        from: "Klickenya <noreply@klickenya.com>",
        to: adminEmail,
        subject: `Admin: Host deleted — ${host.display_name}`,
        html: hostDeletedToAdminHtml({
          name: host.display_name ?? "Host",
          email: host.email ?? "",
        }),
      })
      .catch(() => {});
  }

  return { success: true, unassignedCount: listings.length };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/admin/deleteHost.ts
git commit -m "feat(admin-hosts): deleteHostAccount with auto-unassign

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: `PATCH` + `DELETE` route

**Files:**
- Create: `apps/web/app/api/admin/hosts/[id]/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import {
  updateHostAccount,
  HostEmailConflictError,
} from "@/lib/admin/updateHost";
import { deleteHostAccount } from "@/lib/admin/deleteHost";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;
    const { name, email, phone, password } = await request.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }
    if (password && String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await updateHostAccount({
      id,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      password: password || null,
    });

    revalidatePath(`/admin/hosts/${id}`);
    revalidatePath("/admin/hosts");

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof HostEmailConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Update host error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;

    await deleteHostAccount({ id });

    revalidatePath("/admin/hosts");

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Delete host error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/api/admin/hosts/[id]/route.ts"
git commit -m "feat(admin-hosts): PATCH + DELETE host route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Shared create/edit modal + wire into list page

**Files:**
- Create: `apps/web/app/admin/hosts/HostFormModal.tsx`
- Modify: `apps/web/app/admin/hosts/page.tsx` (import + usage)
- Delete: `apps/web/app/admin/hosts/CreateHostModal.tsx`

- [ ] **Step 1: Create `HostFormModal.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

const INPUT_CLASS =
  "w-full px-4 py-2.5 text-[16px] rounded-xl border border-border bg-canvas text-dark outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-text3 uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

interface HostFormModalProps {
  mode: "create" | "edit";
  hostId?: string;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  triggerLabel: string;
  triggerClassName: string;
}

export function HostFormModal({
  mode,
  hostId,
  initialName = "",
  initialEmail = "",
  initialPhone = "",
  triggerLabel,
  triggerClassName,
}: HostFormModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordValid =
    mode === "edit"
      ? password === "" || password.length >= 8
      : password.length >= 8;
  const canSubmit =
    !!name.trim() && !!email.trim() && passwordValid && !loading;

  function reset() {
    setName(initialName);
    setEmail(initialEmail);
    setPhone(initialPhone);
    setPassword("");
    setError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const url =
        mode === "create"
          ? "/api/admin/hosts/create"
          : `/api/admin/hosts/${hostId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      };
      if (mode === "create" || password) body.password = password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        if (mode === "create") reset();
        else setPassword("");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-[20px] font-bold text-dark mb-4">
              {mode === "create" ? "Create New Host" : "Edit Host"}
            </h2>

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
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Update `page.tsx` — swap the import (line 4)**

Replace:
```tsx
import { CreateHostModal } from "./CreateHostModal";
```
with:
```tsx
import { HostFormModal } from "./HostFormModal";
```

- [ ] **Step 3: Update `page.tsx` — swap the usage (line 60)**

Replace:
```tsx
          <CreateHostModal />
```
with:
```tsx
          <HostFormModal
            mode="create"
            triggerLabel="+ Create Host"
            triggerClassName="px-4 py-2 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors"
          />
```

- [ ] **Step 4: Delete the old modal**

```bash
git rm apps/web/app/admin/hosts/CreateHostModal.tsx
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/admin/hosts/HostFormModal.tsx apps/web/app/admin/hosts/page.tsx
git commit -m "feat(admin-hosts): shared create/edit host modal

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Delete button + wire Edit/Delete into the detail page

**Files:**
- Create: `apps/web/app/admin/hosts/DeleteHostButton.tsx`
- Modify: `apps/web/app/admin/hosts/[id]/page.tsx` (imports + Section A header)

- [ ] **Step 1: Create `DeleteHostButton.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteHostButton({
  hostId,
  hostName,
}: {
  hostId: string;
  hostName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const canDelete = confirmText.trim() === hostName.trim() && !loading;

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hosts/${hostId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      router.push("/admin/hosts");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-[13px] font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
      >
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-[20px] font-bold text-dark mb-2">
              Delete host?
            </h2>
            <p className="text-[13px] text-text3 leading-relaxed mb-4">
              This permanently deletes{" "}
              <strong className="text-dark">{hostName}</strong>&apos;s account and
              all of their dashboard data (properties, bookings, menus, kitchen
              records). Their listings will be unassigned and stay live. This
              cannot be undone.
            </p>
            <label className="block text-[12px] font-semibold text-text3 uppercase tracking-wide mb-1">
              Type the host name to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={hostName}
              className="w-full px-4 py-2.5 text-[16px] rounded-xl border border-border bg-canvas text-dark outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            />

            {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleDelete}
                disabled={!canDelete}
                className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete Host"}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                  setError(null);
                }}
                className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Add imports to `[id]/page.tsx` (after the existing `HostListingActions` import on line 5)**

```tsx
import { HostFormModal } from "../HostFormModal";
import { DeleteHostButton } from "../DeleteHostButton";
```

- [ ] **Step 3: Replace the Section A identity header in `[id]/page.tsx`**

Replace this block (currently lines 110–122):
```tsx
        <div className="flex items-center gap-4 mb-6">
          {photoUrl ? (
            <img src={`${photoUrl}?w=96&h=96&fit=crop&auto=format`} alt="" className="size-16 rounded-2xl object-cover" />
          ) : (
            <div className="size-16 rounded-2xl bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[20px] font-bold">
              {initials}
            </div>
          )}
          <div>
            <h1 className="font-display text-[24px] font-bold text-dark">{host.display_name}</h1>
            <p className="text-[13px] text-text3 mt-0.5">{host.email}</p>
          </div>
        </div>
```
with:
```tsx
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <img src={`${photoUrl}?w=96&h=96&fit=crop&auto=format`} alt="" className="size-16 rounded-2xl object-cover" />
            ) : (
              <div className="size-16 rounded-2xl bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[20px] font-bold">
                {initials}
              </div>
            )}
            <div>
              <h1 className="font-display text-[24px] font-bold text-dark">{host.display_name}</h1>
              <p className="text-[13px] text-text3 mt-0.5">{host.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HostFormModal
              mode="edit"
              hostId={host.id}
              initialName={host.display_name ?? ""}
              initialEmail={host.email ?? ""}
              initialPhone={host.phone ?? ""}
              triggerLabel="Edit"
              triggerClassName="px-4 py-2 text-[13px] font-semibold rounded-xl border border-border text-dark hover:bg-[#F5F3F0] transition-colors"
            />
            <DeleteHostButton hostId={host.id} hostName={host.display_name ?? "this host"} />
          </div>
        </div>
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/hosts/DeleteHostButton.tsx "apps/web/app/admin/hosts/[id]/page.tsx"
git commit -m "feat(admin-hosts): edit + delete controls on host detail page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 2: Lint the touched paths**

Run: `cd apps/web && npx eslint app/admin/hosts app/api/admin/hosts lib/admin lib/email/hostEmails.ts`
Expected: no errors (warnings acceptable if pre-existing in the repo style).

- [ ] **Step 3: Manual verification via preview server**

Start the dev server (preview_start) and, signed in as an admin, verify each flow. Use preview tools (snapshot/console/network) — do not ask the user to check manually.

1. **Create with password:** `/admin/hosts` → "+ Create Host" → fill name/email/phone + an 8+ char password → Create. Expect success toast; new host appears in the table; no console/network errors.
2. **Password validation:** in the create modal, type a <8 char password → submit disabled + "At least 8 characters." helper shown.
3. **Edit name/phone:** open a host detail → "Edit" → change name + phone, leave password blank → Save. Expect detail header reflects the change after refresh.
4. **Edit email:** "Edit" → change email → Save. Expect success; reopening shows the new email. (notificationEmail1 propagation is best-effort and exercised server-side; spot-check Sanity if convenient.)
5. **Email conflict:** edit a host to an email already used by another account → expect inline "already in use" error (HTTP 409), no partial UI change.
6. **Set new password on edit:** "Edit" → enter a new 8+ char password → Save → success.
7. **Delete:** "Delete" → confirmation requires typing the exact host name (button disabled until it matches) → Delete → redirected to `/admin/hosts`, host gone from the table.

- [ ] **Step 4: Capture proof**

Use preview_screenshot for the create + edit modals and the post-delete list, and preview_network to confirm the POST/PATCH/DELETE calls return 2xx (and the conflict case returns 409).

---

## Self-Review Notes

- **Spec coverage:** Create-with-password (Task 4, 8) ✓; Edit name/email/phone/password (Tasks 5, 7, 8, 9) ✓; Delete with auto-unassign (Tasks 2, 6, 7, 9) ✓; email propagation to `notificationEmail1` + Sanity host doc (Tasks 2, 5) ✓; notifications on email/password/delete (Tasks 1, 5, 6) ✓; FK-safe delete order (Task 6) ✓; partner-flow preserved (Task 4) ✓.
- **Type consistency:** `HostRef { user_id, sanity_host_id }`, `getAssignedListings`, `unassignListingFromHost`, `setNotificationEmailForAssignedListings`, `HostEmailConflictError`, and all email-template signatures are defined in Tasks 1–2 and consumed verbatim in Tasks 3–9.
- **No placeholders:** every code step contains complete content.
- **Deviation from default TDD:** repo has no test framework; verification is typecheck + lint + preview-based manual checks (documented in Task 10), consistent with the codebase.
