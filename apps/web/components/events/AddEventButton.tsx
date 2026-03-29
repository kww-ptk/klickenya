"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AddEventButtonProps {
  className?: string;
  label?: string;
}

function AddEventButton({ className, label = "Add your event" }: AddEventButtonProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<{
    loggedIn: boolean;
    role: string | null;
  }>({ loggedIn: false, role: null });

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthState({ loggedIn: false, role: null });
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setAuthState({ loggedIn: true, role: profile?.role ?? "guest" });
    }
    check();
  }, []);

  function handleClick() {
    if (!authState.loggedIn) {
      router.push("/register?role=host&returnTo=/dashboard/events/new");
      return;
    }
    router.push("/dashboard/events/new");
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-amber-500 text-zinc-950 font-semibold text-[15px] shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200",
        className
      )}
    >
      {label}
      <ArrowRight className="size-4" />
    </button>
  );
}

export { AddEventButton };
