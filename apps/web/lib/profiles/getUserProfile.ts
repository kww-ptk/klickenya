import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GuestProfile = any;

export async function getUserProfile(userId: string): Promise<GuestProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, email, full_name, role, phone, avatar_url, created_at")
    .eq("id", userId)
    .single();

  return data ?? null;
}
