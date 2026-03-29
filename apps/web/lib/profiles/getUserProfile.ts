import { createClient } from "@/lib/supabase/server";
import type { GuestProfile } from "@klickenya/shared";

export async function getUserProfile(userId: string): Promise<GuestProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, email, full_name, role, phone, avatar_url, created_at")
    .eq("id", userId)
    .single();

  return data ?? null;
}
