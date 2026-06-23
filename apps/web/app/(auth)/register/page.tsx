"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerAction } from "./actions";

const isRegistrationEnabled =
  process.env.NEXT_PUBLIC_GUEST_REGISTRATION === "true";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const returnTo = searchParams.get("returnTo");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleGoogleSignIn() {
    // Store role intent in cookie before redirecting to Google
    if (roleParam) {
      document.cookie = `oauth_role_intent=${roleParam};path=/;max-age=600;samesite=lax`;
    }
    const supabase = createClient();
    const callbackUrl = returnTo
      ? `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`
      : `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  }

  if (!isRegistrationEnabled) {
    return (
      <div className="w-full max-w-[420px] mx-4">
        <div className="bg-white rounded-[22px] shadow-lg p-8 md:p-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-purple flex items-center justify-center">
              <span className="text-white font-bold text-[15px]">k</span>
            </div>
            <span className="text-[20px] font-bold tracking-[-0.03em] text-dark">
              klickenya
            </span>
          </div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-dark mb-2">
            {roleParam === "host" ? "Create your host account" : "Create an account"}
          </h1>
          <p className="text-[14px] text-text2 mb-6">
            {roleParam === "host"
              ? "Sign in with Google to get started as a host on Klickenya"
              : "Sign in with Google to join Klickenya"}
          </p>

          {/* Google sign-in */}
          <button
            onClick={handleGoogleSignIn}
            type="button"
            className="w-full h-11 rounded-full border border-border text-[14px] font-semibold text-dark hover:border-text3 transition-colors flex items-center justify-center gap-2.5 mb-6"
          >
            <svg className="size-[18px]" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-[13px] text-text2">
            Already have an account?{" "}
            <Link href="/login" className="text-purple font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-[420px] mx-4">
        <div className="bg-white rounded-[22px] shadow-lg p-8 md:p-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-purple flex items-center justify-center">
              <span className="text-white font-bold text-[15px]">k</span>
            </div>
            <span className="text-[20px] font-bold tracking-[-0.03em] text-dark">
              klickenya
            </span>
          </div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-dark mb-2">
            Check your email
          </h1>
          <p className="text-[14px] text-text2 mb-6">
            We&apos;ve sent a confirmation link to your email. Click it to
            activate your account.
          </p>
          <Link
            href="/login"
            className="text-[13px] text-purple font-semibold hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await registerAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="w-full max-w-[420px] mx-4">
      <div className="bg-white rounded-[22px] shadow-lg p-8 md:p-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-purple flex items-center justify-center">
            <span className="text-white font-bold text-[15px]">k</span>
          </div>
          <span className="text-[20px] font-bold tracking-[-0.03em] text-dark">
            klickenya
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-center text-dark mb-1">
          Create an account
        </h1>
        <p className="text-[14px] text-text2 text-center mb-8">
          Sign up to start using Klickenya
        </p>

        {/* Form */}
        <form action={handleSubmit} className="space-y-4">
          {/* Carry the host intent through email signup (parity with Google). */}
          <input type="hidden" name="role" value={roleParam ?? ""} />
          <div>
            <label
              htmlFor="name"
              className="block text-[13px] font-medium text-dark mb-1.5"
            >
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full h-11 px-4 rounded-xl border border-border text-[14px] text-dark placeholder:text-text3 outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-[13px] font-medium text-dark mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full h-11 px-4 rounded-xl border border-border text-[14px] text-dark placeholder:text-text3 outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-dark mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full h-11 px-4 rounded-xl border border-border text-[14px] text-dark placeholder:text-text3 outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
              placeholder="At least 8 characters"
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
            className="w-full h-11 rounded-full bg-purple text-white text-[14px] font-semibold hover:bg-[#5a2575] transition-colors disabled:opacity-60 flex items-center justify-center"
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
              "Create account"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[12px] text-text3">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full h-11 rounded-full border border-border text-[14px] font-semibold text-dark hover:border-text3 transition-colors flex items-center justify-center gap-2.5"
        >
          <svg className="size-[18px]" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Sign in link */}
        <p className="text-center text-[13px] text-text2 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-purple font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
