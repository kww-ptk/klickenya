"use client";

import { useMemo, useState } from "react";

interface PropertyEmbedPanelProps {
  /** The property's booking_slug — the key /embed/booking/[slug] resolves by. */
  bookingSlug: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://klickenya.com";

const DEFAULT_ACCENT = "E8A020";
const DEFAULT_BG = "white";
const DEFAULT_THEME: "light" | "dark" = "light";
const DEFAULT_HEIGHT = 760;

type SnippetKind = "script" | "iframe";

/**
 * PropertyEmbedPanel — paste-on-your-website snippet generator for the room
 * booking embed (/embed/booking/[slug]). Parity with the restaurant
 * MenuEmbedPanel / ReservationsEmbedPanel, but script-first: the modern
 * embed.js one-liner is the default, with the raw <iframe> offered as a
 * fallback for site builders that strip <script> tags.
 */
export function PropertyEmbedPanel({ bookingSlug }: PropertyEmbedPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<SnippetKind>("script");
  const [themeOpen, setThemeOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">(DEFAULT_THEME);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [bg, setBg] = useState(DEFAULT_BG);
  const [refTag, setRefTag] = useState("");
  const [copied, setCopied] = useState(false);

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (theme !== DEFAULT_THEME) params.set("theme", theme);
    if (accent !== DEFAULT_ACCENT) params.set("accent", accent);
    if (bg !== DEFAULT_BG) params.set("bg", bg);
    if (refTag.trim()) params.set("ref", refTag.trim().slice(0, 64));
    const qs = params.toString();
    return `${SITE_URL}/embed/booking/${bookingSlug}${qs ? `?${qs}` : ""}`;
  }, [bookingSlug, theme, accent, bg, refTag]);

  const snippet = useMemo(() => {
    if (kind === "iframe") {
      return `<iframe\n  src="${embedUrl}"\n  style="width:100%;height:${DEFAULT_HEIGHT}px;border:0"\n></iframe>`;
    }
    // Modern embed.js form (the brief's target syntax).
    const attrs = [
      `data-klickenya-tool="booking"`,
      `data-slug="${bookingSlug}"`,
      ...(theme !== DEFAULT_THEME ? [`data-theme="${theme}"`] : []),
      ...(accent !== DEFAULT_ACCENT ? [`data-accent="${accent}"`] : []),
      ...(bg !== DEFAULT_BG ? [`data-bg="${bg}"`] : []),
      ...(refTag.trim() ? [`data-ref="${refTag.trim().slice(0, 64)}"`] : []),
    ].join(" ");
    return `<script src="${SITE_URL}/embed.js" async></script>\n<div ${attrs}></div>`;
  }, [kind, embedUrl, bookingSlug, theme, accent, bg, refTag]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (!bookingSlug) return null;

  return (
    <div className="bg-white rounded-xl border border-border p-4 mt-3 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <p className="text-[14px] font-semibold text-dark">
          Embed the booking form on your website
        </p>
        <span className={`text-text3 text-[14px] transition-transform ${expanded ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {!expanded && (
        <p className="text-[12px] text-text3 mt-1">
          Let guests check availability and book rooms from your own site.
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] text-text2 leading-snug">
            Paste this on your site. Works with Squarespace, Wix, Webflow,
            WordPress, or any HTML page.
          </p>

          {/* Snippet kind toggle */}
          <div className="flex gap-2">
            {(
              [
                { key: "script", label: "One-line script" },
                { key: "iframe", label: "iframe (fallback)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setKind(opt.key)}
                className={`flex-1 h-[34px] rounded-full text-[12px] font-semibold transition-colors border ${
                  kind === opt.key
                    ? "bg-amber border-amber text-dark"
                    : "bg-white border-border text-text2 hover:border-text3"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <pre className="text-[11px] leading-snug font-mono bg-surface border border-border rounded-lg p-3 overflow-x-auto whitespace-pre">
            {snippet}
          </pre>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full h-[36px] rounded-full bg-dark text-white text-[13px] font-bold hover:bg-[#2A2520] transition-colors"
          >
            {copied ? "Copied ✓" : "Copy code"}
          </button>

          {/* Theme picker */}
          <div className="border-t border-surface pt-3">
            <button
              type="button"
              onClick={() => setThemeOpen((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-text2 hover:text-dark"
            >
              <span className={`text-[10px] transition-transform ${themeOpen ? "rotate-90" : ""}`}>▸</span>
              Customise colours and tracking
            </button>

            {themeOpen && (
              <div className="mt-3 space-y-3 pl-3 border-l-2 border-surface">
                <div>
                  <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">Theme</label>
                  <div className="flex gap-2">
                    {(["light", "dark"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTheme(t)}
                        className={`flex-1 h-[32px] rounded-full text-[12px] font-semibold transition-colors border ${
                          theme === t ? "bg-amber border-amber text-dark" : "bg-white border-border text-text2 hover:border-text3"
                        }`}
                      >
                        {t === "light" ? "Light" : "Dark"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">Accent colour</label>
                  <div className="flex gap-2 items-center">
                    <div className="size-8 rounded-lg border border-border shrink-0" style={{ background: `#${accent}` }} />
                    <span className="text-text3 text-[12px]">#</span>
                    <input
                      type="text"
                      value={accent}
                      onChange={(e) => setAccent(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 8))}
                      placeholder="E8A020"
                      className="flex-1 h-[32px] rounded-lg border border-border px-2 text-[13px] font-mono uppercase outline-none focus:border-amber"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">Background</label>
                  <div className="flex gap-2">
                    {(["white", "transparent"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBg(b)}
                        className={`flex-1 h-[32px] rounded-full text-[12px] font-semibold transition-colors border ${
                          bg === b ? "bg-amber border-amber text-dark" : "bg-white border-border text-text2 hover:border-text3"
                        }`}
                      >
                        {b === "white" ? "White" : "Transparent"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">Campaign tag (optional)</label>
                  <input
                    type="text"
                    value={refTag}
                    onChange={(e) => setRefTag(e.target.value.slice(0, 64))}
                    placeholder="e.g. instagram-bio"
                    className="w-full h-[32px] rounded-lg border border-border px-3 text-[13px] outline-none focus:border-amber"
                  />
                  <p className="text-[11px] text-text3 mt-1 leading-snug">
                    Tag different placements (Instagram, newsletter, etc.) to see where enquiries come from.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="border-t border-surface pt-3">
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-text2 hover:text-dark"
            >
              <span className={`text-[10px] transition-transform ${previewOpen ? "rotate-90" : ""}`}>▸</span>
              Preview
            </button>

            {previewOpen && (
              <div className="mt-3 rounded-lg overflow-hidden border border-border">
                <iframe
                  src={embedUrl}
                  title="Booking widget preview"
                  style={{ width: "100%", height: 600, border: 0, display: "block" }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
