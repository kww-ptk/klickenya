"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full h-11 rounded-full border border-border text-[14px] font-semibold text-dark hover:border-text3 transition-colors"
    >
      Sign out
    </button>
  );
}
