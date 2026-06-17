"use client";

import { useMemo, useState } from "react";

interface MenuEmbedPanelProps {
  menuSlug: string;
  /** Used to default the "include reservations" toggle. */
  reservationsEnabled: boolean;
  /** When true, the owner is offered the menu-only OR combo snippet.
   *  When false, only the menu-only snippet is offered (no reservations to combo with). */
  hasReservationsOption?: boolean;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://klickenya.com";

const DEFAULT_ACCENT = "E8A020";
const DEFAULT_BG = "white";
const DEFAULT_THEME: "light" | "dark" = "light";
const DEFAULT_HEIGHT = 900;

type EmbedKind = "menu" | "restaurant";

/**
 * MenuEmbedPanel — paste-on-your-website snippet generator for the menu
 * embed. Same pattern as ReservationsEmbedPanel.
 *
 * Owner picks:
 *   - "Menu only" → /embed/menu/<slug>
 *   - "Menu + booking" → /embed/restaurant/<slug>  (only offered when
 *     reservations are enabled — otherwise the option is hidden)
 *
 * Plus theme/accent/bg/ref params and a live preview iframe.
 */
export function MenuEmbedPanel({
  menuSlug,
  reservationsEnabled,
  hasReservationsOption = true,
}: MenuEmbedPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Default to combo if reservations are on (most owners want booking too).
  const [kind, setKind] = useState<EmbedKind>(
    hasReservationsOption && reservationsEnabled ? "restaurant" : "menu",
  );
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
    return `${SITE_URL}/embed/${kind}/${menuSlug}${qs ? `?${qs}` : ""}`;
  }, [kind, menuSlug, theme, accent, bg, refTag]);

  const snippet = useMemo(
    () =>
      `<iframe\n  src="${embedUrl}"\n  style="width:100%;height:${DEFAULT_HEIGHT}px;border:0"\n></iframe>`,
    [embedUrl],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <p className="text-[14px] font-semibold text-[#16130C]">
          Embed menu on your website
        </p>
        <span
          className={`text-[#9C9485] text-[14px] transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {!expanded && (
        <p className="text-[12px] text-[#9C9485] mt-1">
          Add your menu to your own site with one line of HTML.
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] text-[#5E5848] leading-snug">
            Paste this snippet on your site. Works with Squarespace, Wix,
            Webflow, WordPress, or any HTML page.
          </p>

          {/* Kind picker — Menu only vs Menu + booking */}
          {hasReservationsOption && reservationsEnabled && (
            <div className="flex gap-2">
              {(
                [
                  { key: "menu", label: "Menu only" },
                  { key: "restaurant", label: "Menu + booking" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setKind(opt.key)}
                  className={`flex-1 h-[34px] rounded-full text-[12px] font-semibold transition-colors border ${
                    kind === opt.key
                      ? "bg-[#E8A020] border-[#E8A020] text-[#16130C]"
                      : "bg-white border-[#E2DDD5] text-[#5E5848] hover:border-[#9C9485]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <pre className="text-[11px] leading-snug font-mono bg-[#F4F1EC] border border-[#E2DDD5] rounded-lg p-3 overflow-x-auto whitespace-pre">
            {snippet}
          </pre>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full h-[36px] rounded-full bg-[#16130C] text-white text-[13px] font-bold hover:bg-[#2A2520] transition-colors"
          >
            {copied ? "Copied ✓" : "Copy code"}
          </button>

          {/* Theme picker */}
          <div className="border-t border-[#F4F1EC] pt-3">
            <button
              type="button"
              onClick={() => setThemeOpen((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#5E5848] hover:text-[#16130C]"
            >
              <span
                className={`text-[10px] transition-transform ${themeOpen ? "rotate-90" : ""}`}
              >
                ▸
              </span>
              Customise colours and tracking
            </button>

            {themeOpen && (
              <div className="mt-3 space-y-3 pl-3 border-l-2 border-[#F4F1EC]">
                <div>
                  <label className="block text-[11px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">
                    Theme
                  </label>
                  <div className="flex gap-2">
                    {(["light", "dark"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTheme(t)}
                        className={`flex-1 h-[32px] rounded-full text-[12px] font-semibold transition-colors border ${
                          theme === t
                            ? "bg-[#E8A020] border-[#E8A020] text-[#16130C]"
                            : "bg-white border-[#E2DDD5] text-[#5E5848] hover:border-[#9C9485]"
                        }`}
                      >
                        {t === "light" ? "Light" : "Dark"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">
                    Accent colour
                  </label>
                  <div className="flex gap-2 items-center">
                    <div
                      className="size-8 rounded-lg border border-[#E2DDD5] shrink-0"
                      style={{ background: `#${accent}` }}
                    />
                    <span className="text-[#9C9485] text-[12px]">#</span>
                    <input
                      type="text"
                      value={accent}
                      onChange={(e) =>
                        setAccent(
                          e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 8),
                        )
                      }
                      placeholder="E8A020"
                      className="flex-1 h-[32px] rounded-lg border border-[#E2DDD5] px-2 text-[13px] font-mono uppercase outline-none focus:border-[#E8A020]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">
                    Background
                  </label>
                  <div className="flex gap-2">
                    {(["white", "transparent"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBg(b)}
                        className={`flex-1 h-[32px] rounded-full text-[12px] font-semibold transition-colors border ${
                          bg === b
                            ? "bg-[#E8A020] border-[#E8A020] text-[#16130C]"
                            : "bg-white border-[#E2DDD5] text-[#5E5848] hover:border-[#9C9485]"
                        }`}
                      >
                        {b === "white" ? "White" : "Transparent"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">
                    Campaign tag (optional)
                  </label>
                  <input
                    type="text"
                    value={refTag}
                    onChange={(e) => setRefTag(e.target.value.slice(0, 64))}
                    placeholder="e.g. instagram-bio"
                    className="w-full h-[32px] rounded-lg border border-[#E2DDD5] px-3 text-[13px] outline-none focus:border-[#E8A020]"
                  />
                  <p className="text-[11px] text-[#9C9485] mt-1 leading-snug">
                    Tag different placements (Instagram, newsletter, etc.) — appears next to reservations in the dashboard.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#F4F1EC] pt-3">
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#5E5848] hover:text-[#16130C]"
            >
              <span
                className={`text-[10px] transition-transform ${previewOpen ? "rotate-90" : ""}`}
              >
                ▸
              </span>
              Preview
            </button>

            {previewOpen && (
              <div className="mt-3 rounded-lg overflow-hidden border border-[#E2DDD5]">
                <iframe
                  src={embedUrl}
                  title="Menu preview"
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
