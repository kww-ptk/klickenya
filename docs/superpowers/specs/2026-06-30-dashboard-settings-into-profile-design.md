# Merge Dashboard Settings into Edit Profile

**Date:** 2026-06-30
**Status:** Approved design

## Goal

Consolidate `/dashboard/settings` into `/dashboard/profile/edit` so there is a
single "Edit Profile" destination on both mobile and desktop. The settings
content moves to the bottom of the Edit Profile page; the separate "Settings" nav
entry is removed and `/dashboard/settings` redirects to Edit Profile.

## Current state

- **`/dashboard/profile/edit`** — server page → `EditProfileForm` (photo, display
  name, bio, website, instagram, facebook, phone → Sanity host doc + host_profiles
  phone). It **hard-redirects to `/dashboard` when the host has no `sanity_host_id`**.
- **`/dashboard/settings`** — server page with: read-only Account (Email/Name/Role/
  Phone), Password (Set/Change → `/reset-password`, gated on `password_changed`),
  Notifications (`SettingsClient` — local toggles), Danger Zone (mailto delete).
- **Nav** ([layout.tsx](apps/web/app/dashboard/layout.tsx)) — one sidebar `<nav>`
  used at both breakpoints, with both an "Edit Profile" and a "Settings"
  `DashboardNavLink`.

## Design

### 1. `AccountSettings` component (new) — `apps/web/app/dashboard/profile/edit/AccountSettings.tsx`
Server component, props `{ email: string; role: string; passwordChanged: boolean; userId: string }`.
Renders the settings cards (same styling as today):
- **Account** — read-only **Email** and **Role** only (Name/Phone are editable in the form above; dropped here).
- **Password** — Set password (if `passwordChanged === false`) / Change password, both → `/reset-password`.
- **Notifications** — `<SettingsClient userId={userId} />`.
- **Danger Zone** — "Request account deletion" mailto.

### 2. Move `SettingsClient`
`git mv apps/web/app/dashboard/settings/SettingsClient.tsx apps/web/app/dashboard/profile/edit/SettingsClient.tsx`; `AccountSettings` imports it from `./SettingsClient`. (Its only current importer is the settings page, which becomes a redirect.)

### 3. `/dashboard/profile/edit` page — render settings, don't lock out setup-incomplete hosts
- Fetch the host's `users` row (`email`, `role`) and `host_profiles`
  (`sanity_host_id`, `display_name`, `phone`, `password_changed`).
- **Replace the hard redirect** on missing `sanity_host_id`: instead, render the
  page for any authenticated host. The `EditProfileForm` renders **only when a
  Sanity host doc exists**; when it doesn't, show a short note ("Your public
  profile becomes editable once a listing is assigned to you.") in its place.
- Always render `<AccountSettings email role passwordChanged userId />` at the
  bottom — so password / notifications / account remain reachable for hosts
  created via the admin or guest-upgrade flows (who have no `sanity_host_id` yet).
- If there is no `host_profiles` row at all, keep redirecting to `/dashboard`
  (not a host).

### 4. Nav — one entry
In `layout.tsx`, remove the "Settings" `DashboardNavLink` (the `/dashboard/settings`
entry). Keep the "Edit Profile" entry (→ `/dashboard/profile/edit`). Applies to
both mobile and desktop since it is one shared nav.

### 5. `/dashboard/settings` → redirect
Replace the settings page body with `redirect("/dashboard/profile/edit")` (server
component). Preserves bookmarks / any mobile menu link that still points there.
The old `SettingsClient.tsx` in that folder is gone (moved in step 2).

## Data flow

Host opens Edit Profile (from the single nav entry) → edits their public profile
(if a Sanity host doc exists) → scrolls to the Account section for email/role,
password, notifications, and account-deletion — all on one page. Visiting the old
`/dashboard/settings` URL redirects here.

## Error handling / edge cases

- Host with no `sanity_host_id`: edit form hidden with a note; settings still shown.
- Non-host (no `host_profiles` row): redirect to `/dashboard` (unchanged intent).
- Notification toggles remain local-only ("coming soon"), unchanged.

## Testing / verification

No test framework; verify via `npx tsc --noEmit` + ESLint and a preview check:
the sidebar shows only "Edit Profile" (no "Settings"); the Edit Profile page shows
the form plus the Account/Password/Notifications/Danger sections; `/dashboard/settings`
redirects to `/dashboard/profile/edit`.

## Out of scope

- Persisting the notification toggles (still local/"coming soon").
- Any change to the reset-password flow or the account-deletion process.
- The unrelated property settings page (`/dashboard/property/[id]/settings`).
