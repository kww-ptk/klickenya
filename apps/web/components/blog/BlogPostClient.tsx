"use client";

import { useEffect, useRef, useState, useCallback, type FormEvent } from "react";

/* ═══════════════════════════════════════════════════════════════════
   BlogPostClient — wrapper that adds progress bar + interactive
   behaviors (TOC highlighting, scroll-reveal, progress %).
   ═══════════════════════════════════════════════════════════════════ */

interface BlogPostClientProps {
  readingTime: number;
  title: string;
  url: string;
  children: React.ReactNode;
}

function BlogPostClient({ readingTime, title, url, children }: BlogPostClientProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    /* ── Scroll progress ──────────────────────────────────────── */
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(Math.round((scrollTop / docHeight) * 100), 100) : 0;
      setProgress(pct);

      // Update any progress-percentage text element
      const pctEl = document.getElementById("prog-pct");
      if (pctEl) pctEl.textContent = `${pct}%`;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    /* ── TOC active section highlighting ──────────────────────── */
    const headings = document.querySelectorAll("article h2[id]");
    const tocItems = document.querySelectorAll(".toc-item");

    if (headings.length === 0 || tocItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            tocItems.forEach((item) => {
              const el = item as HTMLElement;
              const sectionId = el.getAttribute("data-section-id");
              if (sectionId === id) {
                el.classList.add("text-amber", "font-semibold");
                // Highlight the numbered circle
                const circle = el.querySelector("span");
                if (circle) {
                  circle.classList.add("border-amber", "text-amber", "bg-amber/10");
                  circle.classList.remove("border-border", "text-text3", "bg-white");
                }
              } else {
                el.classList.remove("text-amber", "font-semibold");
                const circle = el.querySelector("span");
                if (circle) {
                  circle.classList.remove("border-amber", "text-amber", "bg-amber/10");
                  circle.classList.add("border-border", "text-text3", "bg-white");
                }
              }
            });
          }
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    /* ── Scroll reveal ────────────────────────────────────────── */
    const srElements = document.querySelectorAll(".sr, .sr-r");

    if (srElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("on");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    srElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ── Progress bar ─────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-[500] h-[3px]">
        <div
          className="h-full transition-[width] duration-150 ease-out"
          style={{
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, #E8A020 0%, #F5C842 50%, #E8A020 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s linear infinite",
          }}
        />
      </div>

      {children}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ShareButtons — share / copy URL with navigator.share fallback
   ═══════════════════════════════════════════════════════════════════ */

interface ShareButtonsProps {
  title: string;
  url: string;
}

function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareArticle = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled or share failed — ignore
      }
    } else {
      // Fallback: copy to clipboard
      await copyLink();
    }
  }, [title, url]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [url]);

  return (
    <div className="flex flex-wrap gap-2.5">
      {/* Share button */}
      <button
        onClick={shareArticle}
        className="flex items-center gap-2 px-4 py-2.5 bg-dark text-white text-[13px] font-semibold rounded-full hover:bg-dark/85 transition-colors duration-200"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>

      {/* Copy link button */}
      <button
        onClick={copyLink}
        className="flex items-center gap-2 px-4 py-2.5 bg-surface text-text2 text-[13px] font-semibold rounded-full border border-border hover:bg-surface2 transition-colors duration-200"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        {copied ? "Copied!" : "Copy link"}
      </button>

      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center size-10 rounded-full bg-surface border border-border text-text2 hover:bg-surface2 transition-colors duration-200"
        aria-label="Share on X"
      >
        <span className="text-[14px] font-bold">X</span>
      </a>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center size-10 rounded-full bg-surface border border-border text-text2 hover:bg-surface2 transition-colors duration-200"
        aria-label="Share on Facebook"
      >
        <span className="text-[13px] font-bold">fb</span>
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   NewsletterForm — email subscribe with success / error state
   ═══════════════════════════════════════════════════════════════════ */

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!email || status === "loading") return;

      setStatus("loading");
      setErrorMsg("");

      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Something went wrong");
        }

        setStatus("success");
        setEmail("");
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [email, status]
  );

  if (status === "success") {
    return (
      <div className="relative flex items-center gap-2 text-green text-[14px] font-semibold">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        You&apos;re subscribed!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          required
          className="flex-1 min-w-0 h-10 px-4 bg-white/8 border border-white/10 rounded-full text-[14px] text-white placeholder:text-white/30 outline-none focus:border-amber/50 transition-colors duration-200"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-10 px-5 bg-amber text-dark text-[13px] font-bold rounded-full hover:bg-amber2 transition-colors duration-200 disabled:opacity-60 shrink-0"
        >
          {status === "loading" ? "..." : "Subscribe"}
        </button>
      </div>
      {status === "error" && errorMsg && (
        <p className="mt-2 text-[12px] text-red-400">{errorMsg}</p>
      )}
    </form>
  );
}

export { BlogPostClient, ShareButtons, NewsletterForm };
