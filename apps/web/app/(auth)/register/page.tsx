"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerAction } from "./actions";

const isRegistrationEnabled =
  process.env.NEXT_PUBLIC_GUEST_REGISTRATION === "true";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isRegistrationEnabled) {
    return (
      <div className="w-full max-w-[420px] mx-4">
        <div className="bg-white rounded-[22px] shadow-lg p-8 md:p-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#6B2D8B] flex items-center justify-center">
              <span className="text-white font-bold text-[15px]">k</span>
            </div>
            <span className="text-[20px] font-bold tracking-[-0.03em] text-[#16130C]">
              klickenya
            </span>
          </div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[#16130C] mb-2">
            Coming soon
          </h1>
          <p className="text-[14px] text-[#5E5848] mb-6">
            Guest registration will be available soon.
          </p>
          <Link
            href="/login"
            className="text-[13px] text-[#6B2D8B] font-semibold hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-[420px] mx-4">
        <div className="bg-white rounded-[22px] shadow-lg p-8 md:p-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#6B2D8B] flex items-center justify-center">
              <span className="text-white font-bold text-[15px]">k</span>
            </div>
            <span className="text-[20px] font-bold tracking-[-0.03em] text-[#16130C]">
              klickenya
            </span>
          </div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[#16130C] mb-2">
            Check your email
          </h1>
          <p className="text-[14px] text-[#5E5848] mb-6">
            We&apos;ve sent a confirmation link to your email. Click it to
            activate your account.
          </p>
          <Link
            href="/login"
            className="text-[13px] text-[#6B2D8B] font-semibold hover:underline"
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
          <div className="w-8 h-8 rounded-lg bg-[#6B2D8B] flex items-center justify-center">
            <span className="text-white font-bold text-[15px]">k</span>
          </div>
          <span className="text-[20px] font-bold tracking-[-0.03em] text-[#16130C]">
            klickenya
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-center text-[#16130C] mb-1">
          Create an account
        </h1>
        <p className="text-[14px] text-[#5E5848] text-center mb-8">
          Sign up to start using Klickenya
        </p>

        {/* Form */}
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-[13px] font-medium text-[#16130C] mb-1.5"
            >
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full h-11 px-4 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#6B2D8B] focus:ring-2 focus:ring-[#6B2D8B]/20 transition-all"
              placeholder="Jane Doe"
            />
          </div>

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
              autoComplete="email"
              className="w-full h-11 px-4 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#6B2D8B] focus:ring-2 focus:ring-[#6B2D8B]/20 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-[#16130C] mb-1.5"
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
              className="w-full h-11 px-4 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#6B2D8B] focus:ring-2 focus:ring-[#6B2D8B]/20 transition-all"
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
              "Create account"
            )}
          </button>
        </form>

        {/* Sign in link */}
        <p className="text-center text-[13px] text-[#5E5848] mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[#6B2D8B] font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
