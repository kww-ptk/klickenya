import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Cached per-request: returns { user, supabase } */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
});

/** Cached per-request: returns user profile row */
export const getUserProfile = cache(async (userId: string) => {
  const { supabase } = await getAuthUser();
  const { data } = await supabase
    .from("users")
    .select("full_name, email, role")
    .eq("id", userId)
    .single();
  return data;
});

/** Cached per-request: returns host_profiles row */
export const getHostProfile = cache(async (userId: string) => {
  const { supabase } = await getAuthUser();
  const { data } = await supabase
    .from("host_profiles")
    .select("user_id, display_name, plan_tier, password_changed, sanity_host_id")
    .eq("user_id", userId)
    .single();
  return data;
});
