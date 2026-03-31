"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loginAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  link_expired:
    "Your confirmation link has expired. Please register again or request a new link.",
  auth_error: "Something went wrong with authentication. Please try again.",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const returnTo = searchParams.get("returnTo");
  const prefillEmail = searchParams.get("email") ?? "";
  const prefillTemp = searchParams.get("temp") ?? "";
  const [error, setError] = useState<string | null>(
    urlError ? ERROR_MESSAGES[urlError] ?? ERROR_MESSAGES.auth_error : null
  );
  const [isPending, startTransition] = useTransition();
  const [autoLogging, setAutoLogging] = useState(!!prefillEmail && !!prefillTemp);
  const router = useRouter();
  const autoLoginAttempted = useRef(false);

  // Auto-login when email + temp params are present
  useEffect(() => {
    if (!prefillEmail || !prefillTemp || autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;

    const formData = new FormData();
    formData.set("email", prefillEmail);
    formData.set("password", prefillTemp);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result.error) {
        setError(result.error);
        setAutoLogging(false);
      } else if (result.redirect) {
        router.push(result.redirect);
      }
    });
  }, [prefillEmail, prefillTemp, router]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result.error) {
        setError(result.error);
      } else if (returnTo) {
        router.push(returnTo);
      } else if (result.redirect) {
        router.push(result.redirect);
      }
    });
  }

  async function handleGoogleSignIn() {
    const supabase = createClient();
    const callbackUrl = returnTo
      ? `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`
      : `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
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
          {autoLogging ? "Logging you in..." : "Welcome back"}
        </h1>
        <p className="text-[14px] text-[#5E5848] text-center mb-8">
          {autoLogging ? "Please wait" : "Sign in to your Klickenya account"}
        </p>

        {/* Form */}
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[13px] font-medium text-[#16130C] mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={prefillEmail}
              autoComplete="email"
              className="w-full h-11 px-4 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#6B2D8B] focus:ring-2 focus:ring-[#6B2D8B]/20 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="text-[13px] font-medium text-[#16130C]"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-[#6B2D8B] font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              defaultValue={prefillTemp}
              autoComplete="current-password"
              className="w-full h-11 px-4 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#6B2D8B] focus:ring-2 focus:ring-[#6B2D8B]/20 transition-all"
              placeholder="••••••••"
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
              "Sign in"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-[#E2DDD5]" />
          <span className="text-[12px] text-[#9C9485]">or</span>
          <div className="flex-1 h-px bg-[#E2DDD5]" />
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full h-11 rounded-full border border-[#E2DDD5] text-[14px] font-semibold text-[#16130C] hover:border-[#9C9485] transition-colors flex items-center justify-center gap-2.5"
        >
          <svg className="size-[18px]" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Sign up link */}
        <p className="text-center text-[13px] text-[#5E5848] mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-[#6B2D8B] font-semibold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
