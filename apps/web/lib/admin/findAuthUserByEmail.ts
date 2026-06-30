import { adminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/**
 * Find an auth user by email — authoritative against auth.users, which is the
 * source of truth for "email already registered". An auth user can exist
 * WITHOUT a matching public.users row (public.users is only created on login via
 * the auth callback, not at signup, and there is no DB trigger), so a query
 * against public.users alone misses those accounts. GoTrue normalises emails to
 * lowercase; we compare lowercased and paginate to cover the full user base.
 */
export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const target = email.trim().toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (users.length < perPage) break; // last page reached
  }
  return null;
}
