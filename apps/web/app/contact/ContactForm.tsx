"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";

const SUBJECTS = [
  "General enquiry",
  "I want to list my space",
  "Press & media",
  "Partnership",
  "Bug report",
];

export function ContactForm() {
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General enquiry");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  // Pre-fill subject from URL search params
  useEffect(() => {
    const paramSubject = searchParams.get("subject");
    if (paramSubject && SUBJECTS.includes(paramSubject)) {
      setSubject(paramSubject);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact-general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          website: honeypot,
          turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
      setName("");
      setEmail("");
      setSubject("General enquiry");
      setMessage("");
      setHoneypot("");
      setTurnstileToken(null);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message ?? "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-[20px] p-8 text-center">
        <span className="text-[40px] block mb-4">{"\u2705"}</span>
        <h3 className="text-[18px] font-semibold text-text mb-2">
          Message sent!
        </h3>
        <p className="text-[14px] text-text2 leading-[1.65]">
          Thanks for reaching out. We&apos;ve received your message and will get
          back to you within 24 hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-[14px] font-semibold text-amber hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-[13px] font-medium text-text mb-1.5"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full px-4 py-3 rounded-[12px] border border-border bg-white text-[15px] text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-colors"
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-[13px] font-medium text-text mb-1.5"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 rounded-[12px] border border-border bg-white text-[15px] text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-colors"
        />
      </div>

      {/* Subject */}
      <div>
        <label
          htmlFor="subject"
          className="block text-[13px] font-medium text-text mb-1.5"
        >
          Subject
        </label>
        <select
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-4 py-3 rounded-[12px] border border-border bg-white text-[15px] text-text focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-colors appearance-none"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          className="block text-[13px] font-medium text-text mb-1.5"
        >
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind..."
          className="w-full px-4 py-3 rounded-[12px] border border-border bg-white text-[15px] text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-colors resize-none"
        />
      </div>

      {/* Honeypot (hidden from real users) */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ display: "none" }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {/* Turnstile */}
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={(token) => setTurnstileToken(token)}
        onError={() => setTurnstileToken(null)}
        onExpire={() => setTurnstileToken(null)}
      />

      {/* Error */}
      {status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-[12px] px-4 py-3">
          <p className="text-[13px] text-red-600">{errorMessage}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading" || !turnstileToken}
        className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-amber text-dark font-semibold text-[15px] shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_14px_rgba(232,160,32,0.35)]"
      >
        {status === "loading" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
