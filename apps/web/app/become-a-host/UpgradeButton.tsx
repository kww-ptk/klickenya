"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UpgradeButtonProps {
  label: string;
  redirectTo: string;
}

export function UpgradeButton({ label, redirectTo }: UpgradeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in → register as host
        router.push(`/register?role=host&returnTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      // Check current role
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "host" || profile?.role === "admin") {
        // Already a host → go directly
        router.push(redirectTo);
        return;
      }

      // Upgrade guest → host
      const res = await fetch("/api/auth/upgrade-to-host", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Something went wrong");
        return;
      }

      router.push(redirectTo);
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#E8A020] text-white text-[14px] font-semibold hover:bg-[#d4911c] transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
      <ArrowRight className="size-4" />
    </button>
  );
}
