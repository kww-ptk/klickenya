# Admin Create-Host: Upgrade Existing Guest → Host

**Date:** 2026-06-29
**Status:** Approved design

## Goal

In the admin create-host flow, when the entered email already belongs to an
existing **guest** account, stop blocking with "email already in use." Instead,
offer the admin an **Upgrade to host** option that elevates the guest's role to
host — reusing the exact guest→host upgrade logic that already runs on claim
approval. The upgrade preserves the user's credentials, `users` row, and account
history; it only flips the role and creates the `host_profiles` row. **No new
password is generated and no email is sent** on this path. After upgrading, the
admin continues and assigns listings to that host as normal.

## Approved decisions

| Decision | Choice |
|---|---|
| Reuse | **Extract a shared `upgradeGuestToHost()` helper** (single source of truth) and refactor the claim-approve route to call it. |
| Existing-host email | Inform the admin "already a host" + link to that host's detail page (where they assign). |
| Email on upgrade | None sent. (No password, no reset — user keeps working credentials.) |
| Detection | Look up `public.users` by email and branch on `role` (the "check guest/host status first" requirement). |

## The logic being reused

The working guest→host upgrade lives inline in
[claims/[id]/approve/route.ts:94-143](apps/web/app/api/admin/claims/[id]/approve/route.ts),
the `else if (existingUser)` branch:
1. `auth.admin.updateUserById(userId, { user_metadata: { role: "host", name } })`
2. `users.update({ role: "host" }).eq("id", userId)`
3. Generate a unique `host_profiles.slug` (base slug from name; append a random
   suffix on collision).
4. Insert `host_profiles` (user_id, slug, display_name, email, phone, city,
   website_url, social_url, claim_request_id, ghl_contact_id).

No password change, no auth deletion — credentials and history are untouched.
(`host_profiles` requires NOT-NULL `slug`, `display_name`, `email`; the standalone
`/api/auth/upgrade-to-host` route omits slug/email and is NOT reused.)

## Architecture

### 1. Shared helper — `apps/web/lib/admin/upgradeGuestToHost.ts` (new)
```
upgradeGuestToHost({
  userId, name, email, phone,
  city?, websiteUrl?, socialUrl?, claimRequestId?, ghlContactId?
}): Promise<{ userId: string; hostId: string; slug: string }>
```
Encapsulates steps 1–4 above using `adminClient` (service-role; has `auth.admin`).
Slug uniqueness is checked against `host_profiles.slug`. Idempotent guard: if a
`host_profiles` row already exists for `userId`, return it without re-inserting.

### 2. Refactor claim-approve to use the helper
Replace the inline `else if (existingUser)` body in the approve route with a call
to `upgradeGuestToHost({ userId: existingUser.id, name: claim.claimant_name,
email: claim.claimant_email, phone: claim.claimant_phone, city: claim.listing_city,
websiteUrl: claim.website_url, socialUrl: claim.social_media_url,
claimRequestId: id, ghlContactId: claim.ghl_contact_id })`, then set
`userId`/`isNewHost = true` from its result. The other two branches
(`existingHost` increment, brand-new user) are unchanged, as is the email/Sanity
logic downstream. Behavior-preserving.

### 3. Create route — detect existing user by email
In `POST /api/admin/hosts/create`, before creating, query
`adminClient.from("users").select("id, role").eq("email", email).maybeSingle()`:
- **No row** → proceed to `createHostAccount` as today (new host).
- **role = "guest"** → return `409 { conflict: "guest", email, name, userId }`.
- **role = "host"** (or a `host_profiles` row exists) → return
  `409 { conflict: "host", hostId }`.
- **role = "admin"** → return `409 { conflict: "admin" }` (block; admins aren't hosts).

(Detection by `public.users.email` — UNIQUE — is reliable and avoids paginated
`auth.admin.listUsers()`.)

### 4. Upgrade endpoint — `POST /api/admin/hosts/upgrade` (new)
Admin-gated (`assertAdmin`). Body `{ email, name, phone }`. Re-looks-up the user by
email; if already host → return its `hostId` (idempotent); if guest → call
`upgradeGuestToHost(...)` and return `{ success: true, hostId, slug }`. No email sent.

### 5. UI — `HostFormModal` (create mode)
On the create submit, branch on the response:
- `conflict: "guest"` → render an inline panel inside the modal: *"<email> belongs
  to a guest account. Upgrade them to a host?"* with an **Upgrade to host** button
  and a Cancel. The button POSTs to `/api/admin/hosts/upgrade` with the form's
  name/email/phone. On success → `router.push("/admin/hosts/<hostId>")` (the assign
  page) and refresh.
- `conflict: "host"` → show "This email is already a host." + a link to
  `/admin/hosts/<hostId>`.
- `conflict: "admin"` → show "This email belongs to an admin account and can't be a host."
- otherwise → existing success behavior.

## Data flow

Admin fills create form → submit → create route looks up `users` by email →
guest conflict → modal shows upgrade panel → admin clicks Upgrade →
`/api/admin/hosts/upgrade` → `upgradeGuestToHost()` flips role + creates
`host_profiles` → modal redirects to `/admin/hosts/<hostId>` → admin assigns
listings via the existing assign flow.

## Error handling / edge cases

- Upgrade endpoint is `assertAdmin`-gated; non-admin → 401/403.
- Race / already-upgraded: `upgradeGuestToHost` returns the existing
  `host_profiles` if present (no duplicate insert; `host_profiles.email`/`slug` are
  UNIQUE so a duplicate would error otherwise).
- Orphaned auth user with no `users` row (rare): falls through to `createHostAccount`,
  whose `createUser` surfaces "already registered" — unchanged from today.
- Slug collision handled by the random-suffix logic carried into the helper.

## Out of scope

- Changing the brand-new-user or existing-host branches of claim approval.
- Sending any notification email on the admin upgrade path.
- The combined "assign at create time" flow (assignment stays the existing
  host-detail action).

## Testing / verification

No test framework in repo; verify via `npx tsc --noEmit` + ESLint, and preview-based
manual check: (1) create-host with a brand-new email still creates a host; (2)
create-host with a known guest email shows the upgrade panel, and upgrading flips
the role + lands on the host detail page; (3) create-host with an existing host
email shows "already a host"; (4) claim approval for a signed-in guest still
upgrades correctly (refactor regression check).
