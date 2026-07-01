# Merge Dashboard Settings into Edit Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate `/dashboard/settings` into `/dashboard/profile/edit` with a single "Edit Profile" nav entry for mobile and desktop.

**Architecture:** Extract the settings cards into an `AccountSettings` component rendered at the bottom of the Edit Profile page; remove the "Settings" nav link (and its now-unused icon); redirect `/dashboard/settings` to Edit Profile. The Edit Profile page stops hard-redirecting hosts with no Sanity host doc so settings stay reachable.

**Tech Stack:** Next.js 15 App Router, Supabase (`@supabase/ssr`), Sanity. No test framework — verify via `npx tsc --noEmit` + ESLint + preview.

**Spec:** `docs/superpowers/specs/2026-06-30-dashboard-settings-into-profile-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/app/dashboard/profile/edit/SettingsClient.tsx` | Move (from `settings/`) | Notification toggles (unchanged) |
| `apps/web/app/dashboard/profile/edit/AccountSettings.tsx` | Create | Account / Password / Notifications / Danger cards |
| `apps/web/app/dashboard/profile/edit/page.tsx` | Modify | Fetch extra fields; render form conditionally + AccountSettings |
| `apps/web/app/dashboard/layout.tsx` | Modify | Remove the Settings nav link + orphaned `GearIcon` |
| `apps/web/app/dashboard/settings/page.tsx` | Modify | Redirect to Edit Profile |

**Verification (from `apps/web` after each task):** `npx tsc --noEmit` → no output, exit 0.

---

## Task 1: Move SettingsClient + create AccountSettings

**Files:**
- Move: `apps/web/app/dashboard/settings/SettingsClient.tsx` → `apps/web/app/dashboard/profile/edit/SettingsClient.tsx`
- Create: `apps/web/app/dashboard/profile/edit/AccountSettings.tsx`

- [ ] **Step 1: Move SettingsClient (content unchanged)**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git mv apps/web/app/dashboard/settings/SettingsClient.tsx apps/web/app/dashboard/profile/edit/SettingsClient.tsx
```

- [ ] **Step 2: Create `AccountSettings.tsx`**

```tsx
import Link from "next/link";
import { SettingsClient } from "./SettingsClient";

interface AccountSettingsProps {
  email: string;
  role: string;
  passwordChanged: boolean;
  userId: string;
}

export function AccountSettings({
  email,
  role,
  passwordChanged,
  userId,
}: AccountSettingsProps) {
  return (
    <div className="space-y-5 max-w-[600px] mt-10">
      <div>
        <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-dark">
          Account &amp; settings
        </h2>
        <p className="text-[13px] text-text3 mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-[15px] font-bold text-dark mb-4">Account</h3>
        <div className="space-y-3 text-[13px]">
          <div className="flex items-center justify-between py-2 border-b border-surface">
            <span className="text-text3">Email</span>
            <span className="text-dark font-medium">{email || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text3">Role</span>
            <span className="text-dark font-medium capitalize">{role || "guest"}</span>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-[15px] font-bold text-dark mb-2">Password</h3>
        {!passwordChanged ? (
          <div>
            <p className="text-[13px] text-text3 mb-3">
              You signed up via a claim link. Set a password to secure your account.
            </p>
            <Link
              href="/reset-password"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-amber text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors"
            >
              Set password
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-text3 mb-3">Change your account password.</p>
            <Link
              href="/reset-password"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-dark text-white text-[13px] font-semibold hover:bg-[#2A2520] transition-colors"
            >
              Change password
            </Link>
          </div>
        )}
      </div>

      {/* Notification preferences */}
      <SettingsClient userId={userId} />

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <h3 className="text-[15px] font-bold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-[13px] text-text3 mb-3">
          Contact support to delete your account and all associated data.
        </p>
        <a
          href="mailto:hello@klickenya.com?subject=Delete my account"
          className="inline-flex items-center px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors"
        >
          Request account deletion
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add "apps/web/app/dashboard/profile/edit/SettingsClient.tsx" "apps/web/app/dashboard/profile/edit/AccountSettings.tsx" "apps/web/app/dashboard/settings/SettingsClient.tsx"
git commit -m "feat(dashboard): AccountSettings component + move SettingsClient

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Render settings on the Edit Profile page (no hard redirect)

**Files:**
- Modify: `apps/web/app/dashboard/profile/edit/page.tsx`

- [ ] **Step 1: Add the AccountSettings import**

Replace:
```tsx
import { EditProfileForm } from "./EditProfileForm";
```
with:
```tsx
import { EditProfileForm } from "./EditProfileForm";
import { AccountSettings } from "./AccountSettings";
```

- [ ] **Step 2: Replace the data fetch + redirect + render**

Replace this block (from the `hostProfile` fetch through the closing of the returned JSX):
```tsx
  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("sanity_host_id, display_name, phone")
    .eq("user_id", user.id)
    .single();

  if (!hostProfile?.sanity_host_id) {
    redirect("/dashboard");
  }

  const host: SanityHost | null = await sanityClient.fetch(
    `*[_type == "host" && _id == $id][0]{
      _id,
      name,
      bio,
      website,
      instagram,
      facebook,
      photo{ asset->{ url } }
    }`,
    { id: hostProfile.sanity_host_id }
  );

  if (!host) redirect("/dashboard");

  return (
    <div>
      <EditProfileForm
        sanityHostId={host._id}
        currentName={host.name ?? hostProfile.display_name ?? ""}
        currentBio={host.bio ?? ""}
        currentWebsite={host.website ?? ""}
        currentInstagram={host.instagram ?? ""}
        currentFacebook={host.facebook ?? ""}
        currentPhone={hostProfile.phone ?? ""}
        currentPhotoUrl={host.photo?.asset?.url ?? null}
      />
    </div>
  );
```
with:
```tsx
  const [{ data: profile }, { data: hostProfile }] = await Promise.all([
    supabase.from("users").select("email, role").eq("id", user.id).single(),
    supabase
      .from("host_profiles")
      .select("sanity_host_id, display_name, phone, password_changed")
      .eq("user_id", user.id)
      .single(),
  ]);

  // Not a host at all — nothing to edit here.
  if (!hostProfile) {
    redirect("/dashboard");
  }

  // The public-profile form needs a Sanity host doc; fetch it only if present.
  let host: SanityHost | null = null;
  if (hostProfile.sanity_host_id) {
    host = await sanityClient.fetch(
      `*[_type == "host" && _id == $id][0]{
        _id,
        name,
        bio,
        website,
        instagram,
        facebook,
        photo{ asset->{ url } }
      }`,
      { id: hostProfile.sanity_host_id }
    );
  }

  return (
    <div>
      {host ? (
        <EditProfileForm
          sanityHostId={host._id}
          currentName={host.name ?? hostProfile.display_name ?? ""}
          currentBio={host.bio ?? ""}
          currentWebsite={host.website ?? ""}
          currentInstagram={host.instagram ?? ""}
          currentFacebook={host.facebook ?? ""}
          currentPhone={hostProfile.phone ?? ""}
          currentPhotoUrl={host.photo?.asset?.url ?? null}
        />
      ) : (
        <div className="max-w-[600px]">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mb-2">
            Edit Profile
          </h1>
          <p className="text-[13px] text-text3">
            Your public profile becomes editable once a listing is assigned to you.
          </p>
        </div>
      )}

      <AccountSettings
        email={profile?.email ?? user.email ?? ""}
        role={profile?.role ?? "guest"}
        passwordChanged={hostProfile.password_changed !== false}
        userId={user.id}
      />
    </div>
  );
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0. (`SanityHost` is already declared in this file; `redirect`, `sanityClient`, `createClient` already imported.)

- [ ] **Step 4: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add "apps/web/app/dashboard/profile/edit/page.tsx"
git commit -m "feat(dashboard): render account settings on edit profile page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: One nav entry + redirect old settings route

**Files:**
- Modify: `apps/web/app/dashboard/layout.tsx`
- Modify: `apps/web/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Remove the Settings nav link**

In `apps/web/app/dashboard/layout.tsx`, delete this block (the last nav link before `</nav>`):
```tsx
          <DashboardNavLink
            href="/dashboard/settings"
            label="Settings"
            icon={<GearIcon />}
          />
```

- [ ] **Step 2: Remove the now-unused `GearIcon`**

In the same file, delete this function (its only use was the Settings link just removed):
```tsx
function GearIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
```

- [ ] **Step 3: Redirect the old settings route**

Replace the ENTIRE contents of `apps/web/app/dashboard/settings/page.tsx` with:
```tsx
import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/dashboard/profile/edit");
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0 (no "GearIcon is not defined" and no unused-var for GearIcon).

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx eslint app/dashboard/layout.tsx "app/dashboard/settings/page.tsx"`
Expected: no NEW errors from these edits.

- [ ] **Step 5: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add "apps/web/app/dashboard/layout.tsx" "apps/web/app/dashboard/settings/page.tsx"
git commit -m "feat(dashboard): single Edit Profile nav + redirect old settings route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 2: Lint touched paths**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx eslint "app/dashboard/profile/edit" app/dashboard/layout.tsx "app/dashboard/settings/page.tsx"`
Expected: no errors on the new/changed files.

- [ ] **Step 3: Confirm the old SettingsClient location is gone and nothing references it**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya" && ls apps/web/app/dashboard/settings/ && grep -rn "settings/SettingsClient" apps/web --include="*.tsx"`
Expected: `settings/` contains only `page.tsx` (+ `loading.tsx` if present); the grep returns nothing.

- [ ] **Step 4: Manual verification via preview**

Signed in as a host:
1. **Nav:** the dashboard sidebar shows only **Edit Profile** (no **Settings**) on both desktop and mobile widths.
2. **Merged page:** `/dashboard/profile/edit` shows the profile form, then an **Account & settings** section (Email + Role, Password → reset-password, Notifications toggles, Danger Zone).
3. **Redirect:** visiting `/dashboard/settings` lands on `/dashboard/profile/edit`.
4. **No lock-out:** a host with no Sanity host doc still sees the Account & settings section (form area shows the "editable once a listing is assigned" note instead of an error/redirect).

- [ ] **Step 5: Capture proof**

preview_screenshot the merged Edit Profile page (form + Account & settings) and the sidebar showing a single Edit Profile entry.

---

## Self-Review Notes

- **Spec coverage:** settings merged to bottom of Edit Profile (Task 1 + 2) ✓; Account block trimmed to Email + Role (Task 1) ✓; single "Edit Profile" nav, Settings removed (Task 3) ✓; `/dashboard/settings` redirects (Task 3) ✓; no hard redirect for hosts without a Sanity host doc (Task 2) ✓; SettingsClient moved, orphaned GearIcon removed (Task 1 + 3) ✓.
- **Type consistency:** `AccountSettingsProps { email, role, passwordChanged, userId }` (Task 1) is passed exactly by the page (Task 2); `passwordChanged={hostProfile.password_changed !== false}` yields a `boolean` matching the prop, and `!passwordChanged` drives the "Set password" branch.
- **No placeholders:** every step has complete code.
- **Deviation from TDD:** no test framework; verification is typecheck + lint + preview (Task 4).
