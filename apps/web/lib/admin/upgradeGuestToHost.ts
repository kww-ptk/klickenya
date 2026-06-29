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
