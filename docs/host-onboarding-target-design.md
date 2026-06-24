# Host Onboarding — Target Design (recommendation)

> Status: **Proposal / decision record — not yet implemented.** Written 2026-06-25.
> Addresses the root problems found in the audits: fragmented host provisioning
> (R-4), broken email host signup (F-4), and **30% of prod hosts having no
> `host_profile`** (NEW-2). See [issues-2026-06-24](./issues-2026-06-24.md),
> [audit-auth-roles-listings](./audit-auth-roles-listings.md),
> [fix-plan-auth-roles-listings](./fix-plan-auth-roles-listings.md).

---

## Guiding principle
**Gate the right thing.** Today the system effectively gates *becoming a host*
(dashboard access) behind admin approval, while letting listings be created
inconsistently. That's backwards. The thing that needs review is **what the public
sees (the listing)** — not whether someone can open the host dashboard.

> **Host access = self-serve & instant. Listing visibility = reviewed.**

This is the standard marketplace model (Airbnb/Booking): you become a host
immediately and can set things up, but your listing goes through checks before it's
public. It removes the admin bottleneck while keeping marketplace quality.

---

## Roles & levels
| Level | Role | How you get it | Can do |
|---|---|---|---|
| Base | **guest** (default) | sign up (email or Google) | browse, book/enquire, save, `/profile` |
| Business | **host** | self-serve upgrade (see flow) | everything a guest can + dashboard/business tools |
| Operator | **admin** | set manually in Supabase (by design) | full control, listing review |

A **working host** requires **both** `users.role = 'host'` **and** a
`host_profiles` row. Setting the role alone is the current failure mode.

---

## Target flow
```
Everyone signs up → GUEST
   │
   └─ clicks "Become a host / List your business"
         → provisionHost() runs → instantly a working HOST → lands in dashboard
              │
              └─ submits a listing → ADMIN REVIEW → listing goes live on marketplace
```
- **Claim** (for businesses already on Klickenya) stays as a parallel entry point,
  but routes through the **same** `provisionHost()`.

---

## The one technical change that fixes most of this
A single shared helper, used by **all** entry points (Google callback, email
register, claim approve, `/list` approve):

```ts
// idempotent: generates a unique slug, sets role, ensures the profile exists
async function provisionHost(userId, { name, email, phone?, city? }) {
  const slug = await uniqueSlug(makeSlug(name) || "host");
  await users.update({ role: "host" }).eq("id", userId);
  await authAdmin.updateUserById(userId, { user_metadata: { role: "host" } });
  const existing = await host_profiles.select("id").eq("user_id", userId).maybeSingle();
  if (!existing)
    await host_profiles.insert({ user_id: userId, slug, display_name: name, email, phone, city });
}
```

Routing all four paths through this **eliminates**:
- **R-4** — divergent provisioning logic (one path now)
- **F-4** — email host signup creating no profile
- **NEW-2** — the 30% broken-host rate (every path always creates the profile)

## Supporting cleanups
1. **Harden the schema:** add a `UNIQUE` constraint on `host_profiles.user_id`
   (makes upserts safe) and give `slug` a default or always generate it in
   `provisionHost`. The fragile schema is *why* careless inserts fail silently.
2. **Backfill** the 3 currently-stranded hosts (role=host, no profile) so they can
   use the dashboard.
3. **Make "Become a host" an explicit in-app action** — not the hidden
   `?role=host` query trick.

---

## Why this is the recommended process
- **Reliable** — one code path means no more dead-end hosts (target: 30% → 0%).
- **Low friction** — guests become hosts instantly and can start setting up; no
  waiting on an admin just to access tools.
- **Quality preserved** — the review gate moves to the **listing** (where it
  belongs), not to dashboard access.
- **Maintainable** — one funnel, one helper, one mental model.

## What to keep vs change
- **Keep:** guest as the base level; admin created manually (correct for security);
  admin review of listings before they go public.
- **Change:** consolidate provisioning into `provisionHost()`; decouple host access
  from listing approval; surface an explicit "Become a host" action.

---

## Dependencies / related open items
- **NEW-1** (Supabase SMTP) must be fixed for the guest signup email to work at
  all — otherwise even step 1 (sign up) is broken for email users.
- **F-1** (link domain) must be deployed for the confirmation link to be valid.
- Listing-approval bugs **B-1/B-2** should be fixed so "reviewed → live" actually
  publishes a verified listing.
