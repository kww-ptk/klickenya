# Admin Host Management — Edit, Delete, Set Password

**Date:** 2026-06-25
**Branch:** `feat/admin-host-management`
**Status:** Approved design

## Goal

From the admin host pages (`/admin/hosts`), an admin must be able to:

1. **Edit** a host account — name, email, phone, and (optionally) set a new password.
2. **Delete** a host account.
3. **Set a password during creation** (the create form gains a required password field; the auto-generated `Welcome####` temp-password + magic-link flow is removed).

Email and password are editable both at creation time and via the edit flow.

## Approved decisions

| Decision | Choice |
|---|---|
| Password at creation | **Always required.** Remove auto temp-password path. Welcome email links to `/login` and **includes the admin-set password** + "change after first login" (consistent with existing `welcomeNNN`-in-email pattern; keeps `password_changed=false` banner). |
| Delete with assigned listings | **Auto-unassign then delete.** |
| Email edit → enquiry routing | **Update both** — change account email AND `notificationEmail1` on all the host's listings. |
| Change notifications | **Notify host on email change, password change, AND deletion.** Plus admin confirmation emails. |
| Delete cascade | Deleting the auth user cascades all Supabase rows that FK with `ON DELETE CASCADE` (properties/PMS, kitchen, menus tied to the user, etc.). Accepted, behind a typed confirmation dialog. **Legacy tables that FK `public.users`/`auth.users` WITHOUT cascade** (e.g. `agents`, `listings.owner_id`, `bookings.guest_id`, `payments.recorded_by`) would block the delete: `public.users` is deleted first as the bottleneck and a foreign-key violation is surfaced as a clean `409` (`HostHasDependentDataError`) before anything destructive runs — no partial orphaning. |

## Data model — what a "host" spans

A host is three Supabase records plus a Sanity doc and N Sanity listings:

- **`auth.users`** — email + password live here (managed via the Supabase service-role admin API).
- **`public.users`** — `id` (= auth id), `email` (UNIQUE), `full_name`, `role`.
- **`host_profiles`** — `user_id` → `auth.users(id)` (**no `ON DELETE CASCADE`**), `display_name`, `email` (UNIQUE), `phone`, `slug`, `sanity_host_id`, `password_changed`.
- **Sanity `host` doc** (optional, via `sanity_host_id`) — has an `email` field.
- **Sanity `listing` docs** — assigned listings carry `hostId` (= user_id), `host._ref` (= sanity_host_id), and `notificationEmail1` (= host email). Found via the existing 3-way query (hostId match OR host._ref match OR `_id` in host doc's `listings[]`).

### FK consequences for deletion
`host_profiles.user_id` and `public.users.id` both reference `auth.users` **without cascade**, so the auth user cannot be deleted while those rows exist. Deletion order is therefore fixed:

1. Auto-unassign every assigned Sanity listing.
2. Delete `host_profiles` row.
3. Delete `public.users` row.
4. `auth.admin.deleteUser(userId)` — last; this cascades any `ON DELETE CASCADE` children.

## Architecture

Mirror the existing `createHost` pattern: thin REST route handlers + server-side lib functions + client modals, all gated by `assertAdmin`. No server actions.

### New / changed lib functions (`apps/web/lib/admin/`)

- **`createHost.ts`** (modify) — `createHostAccount({ name, email, phone, password, partnerId? })`. Use the passed `password`; drop `generateLink` magic-link logic. Welcome email links to `/login` and states the password. `password_changed: false`.
- **`updateHost.ts`** (new) — `updateHostAccount({ id, name, email, phone, password? })`:
  - Load host_profiles row by `id`.
  - If email changed: update `auth.users` email → `public.users` (email + full_name) → `host_profiles` → Sanity host doc email (if `sanity_host_id`) → `notificationEmail1` on all assigned listings. DB writes first; Sanity/notification writes best-effort with logging.
  - If `password` provided: `auth.admin.updateUserById(userId, { password })`, set `password_changed: false`.
  - If name/phone changed: update `public.users.full_name` / `host_profiles`.
  - Send host email-changed / password-changed notices + admin confirmation as applicable.
  - Email uniqueness collision → throw a typed error mapped to **409**.
- **`deleteHost.ts`** (new) — `deleteHostAccount({ id })`: executes the 4-step deletion order above, then sends host account-deleted notice + admin confirmation.
- **`unassignListing.ts`** (new) — extract the listing-unassign logic currently inline in `api/admin/hosts/[id]/unassign/route.ts` into `unassignListingFromHost({ host, sanityId, listingTitle })`. The existing unassign route is refactored to call it; `deleteHostAccount` loops over it.

### New API routes (`apps/web/app/api/admin/hosts/[id]/route.ts`)

- **`PATCH`** — validate body (name/email required, password min 8 if present), `assertAdmin`, call `updateHostAccount`, `revalidatePath`. Map collision → 409, auth errors → their status, else 500.
- **`DELETE`** — `assertAdmin`, call `deleteHostAccount`, `revalidatePath`.

### Email templates (`apps/web/lib/email/hostEmails.ts`)

- Modify `hostWelcomeHtml` — drop magic-link wording; show login link + password note.
- New: `hostEmailChangedHtml` (to host), `hostPasswordChangedHtml` (to host), `hostDeletedHtml` (to host), `hostUpdatedToAdminHtml`, `hostDeletedToAdminHtml`.

### UI (`apps/web/app/admin/hosts/`)

- **`HostFormModal.tsx`** (new) — shared create/edit modal with `mode: "create" | "edit"`. Fields: Name*, Email*, Phone, Password (required in create, optional "leave blank to keep" in edit). Replaces `CreateHostModal` usage on the list page; reused on the detail page for edit.
- **`DeleteHostButton.tsx`** (new) — opens a confirmation dialog requiring the admin to type the host's name; warns that account + all dashboard data is permanently removed. Calls `DELETE`, then routes back to `/admin/hosts`.
- **Detail page** Section A header gains **Edit** and **Delete** controls.

## Validation & edge cases

- Email uniqueness collision across any of the three stores → 409 "email already in use".
- Password min length 8, client + server.
- Email-change partial failure: DB writes (auth, users, host_profiles) committed before best-effort Sanity + `notificationEmail1` writes; log which steps succeeded; never leave auth/db out of sync.
- All routes `assertAdmin`-gated.
- Inputs follow the existing admin modal styling.

## Out of scope

- Bulk host operations.
- Re-sending welcome / password-reset emails as a standalone action.
- Editing host city/website/social/photo (those remain Sanity-managed via "Edit in Sanity").
- Soft-delete / archive (this is a hard delete).
