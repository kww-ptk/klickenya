"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      // Mark password as changed for hosts
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("host_profiles")
          .update({ password_changed: true })
          .eq("user_id", user.id);
      }

      // Redirect based on role

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role;
        router.push(
          role === "admin"
            ? "/admin"
            : role === "host"
              ? "/dashboard"
              : "/account"
        );
      } else {
        router.push("/login");
      }
    });
  }

  return (
    <div className="w-full max-w-[420px] mx-4">
      <div className="bg-white rounded-[22px] shadow-lg p-8 md:p-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#6B2D8B] flex items-center justify-center">
            <span className="text-white font-bold text-[15px]">k</span>
          </div>
          <span className="text-[20px] font-bold tracking-[-0.03em] text-[#16130C]">
            klickenya
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-center text-[#16130C] mb-1">
          Set your password
        </h1>
        <p className="text-[14px] text-[#5E5848] text-center mb-8">
          Choose a new password for your account
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-[#16130C] mb-1.5"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#6B2D8B] focus:ring-2 focus:ring-[#6B2D8B]/20 transition-all"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="block text-[13px] font-medium text-[#16130C] mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#6B2D8B] focus:ring-2 focus:ring-[#6B2D8B]/20 transition-all"
              placeholder="Re-enter your password"
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 rounded-full bg-[#6B2D8B] text-white text-[14px] font-semibold hover:bg-[#5a2575] transition-colors disabled:opacity-60 flex items-center justify-center"
          >
            {isPending ? (
              <svg
                className="animate-spin size-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              "Set password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
