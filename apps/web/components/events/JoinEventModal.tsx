"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface JoinEventModalProps {
  eventSanityId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number, joinerName: string) => void;
}

const inputCls =
  "w-full rounded-xl border border-[#E2DDD5] bg-white px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all";

export function JoinEventModal({
  eventSanityId,
  eventTitle,
  isOpen,
  onClose,
  onSuccess,
}: JoinEventModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check auth state and pre-fill
  useEffect(() => {
    if (!isOpen) return;
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoggedIn(false);
        return;
      }
      setUserId(user.id);
      setLoggedIn(true);

      const { data: profile } = await supabase
        .from("users")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (profile) {
        setName(profile.full_name ?? "");
        setEmail(profile.email ?? user.email ?? "");
      } else {
        setEmail(user.email ?? "");
      }
    }
    check();
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  async function handleGoogleSignIn() {
    const supabase = createClient();
    const currentUrl = window.location.href;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(currentUrl)}`,
      },
    });
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/events/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSanityId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          userId: userId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setSuccess(true);
      onSuccess(data.attendeeCount, name.trim());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-5">
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2DDD5]">
          <h3 className="text-[16px] font-bold text-[#16130C]">
            {success ? "You're in!" : "Join this event"}
          </h3>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-[#F5F3F0] flex items-center justify-center transition-colors">
            <X className="size-4 text-[#9C9485]" />
          </button>
        </div>

        <div className="p-6">
          {/* Success state */}
          {success ? (
            <div className="text-center py-4">
              <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="size-7 text-emerald-600" />
              </div>
              <p className="text-[15px] font-semibold text-[#16130C] mb-2">
                You&apos;re joining {eventTitle}!
              </p>
              <p className="text-[13px] text-[#9C9485]">
                Check your email for the confirmation details.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-xl bg-[#16130C] text-white font-semibold text-[14px] hover:bg-[#2d2a23] transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-[#9C9485] mb-5">
                Let the organiser know you&apos;re coming to <span className="font-semibold text-[#16130C]">{eventTitle}</span>
              </p>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-[13px] text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[#16130C] mb-1">Name *</label>
                  <input
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#16130C] mb-1">Email *</label>
                  <input
                    className={inputCls}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#16130C] mb-1">Phone <span className="font-normal text-[#9C9485]">(optional)</span></label>
                  <input
                    className={inputCls}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254..."
                  />
                </div>

                <button
                  disabled={loading || !name.trim() || !email.trim()}
                  onClick={handleSubmit}
                  className={cn(
                    "w-full py-3 rounded-xl font-semibold text-[14px] transition-colors flex items-center justify-center gap-2",
                    "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {loggedIn ? `Join as ${name || "yourself"}` : "I want to join"}
                </button>

                {/* Google sign-in for non-logged-in users */}
                {!loggedIn && (
                  <>
                    <div className="flex items-center gap-3 my-1">
                      <div className="flex-1 h-px bg-[#E2DDD5]" />
                      <span className="text-[11px] text-[#9C9485] font-medium">or</span>
                      <div className="flex-1 h-px bg-[#E2DDD5]" />
                    </div>

                    <button
                      onClick={handleGoogleSignIn}
                      className="w-full py-3 rounded-xl border border-[#E2DDD5] text-[14px] font-semibold text-[#16130C] hover:bg-[#F5F3F0] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="size-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
