"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { forgotPasswordAction } from "./actions";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

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
            If an account exists for that email, we&apos;ve sent a password
            reset link.
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
      const result = await forgotPasswordAction(formData);
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
          Reset your password
        </h1>
        <p className="text-[14px] text-text2 text-center mb-8">
          Enter your email and we&apos;ll send you a reset link
        </p>

        {/* Form */}
        <form action={handleSubmit} className="space-y-4">
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
              defaultValue={prefillEmail}
              autoComplete="email"
              className="w-full h-11 px-4 rounded-xl border border-border text-[14px] text-dark placeholder:text-text3 outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
              placeholder="you@example.com"
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
              "Send reset link"
            )}
          </button>
        </form>

        {/* Back to sign in */}
        <p className="text-center text-[13px] text-text2 mt-6">
          <Link
            href="/login"
            className="text-purple font-semibold hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
