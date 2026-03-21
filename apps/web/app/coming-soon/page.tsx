"use client";

import { useRef, useEffect, useState, useCallback } from "react";

export default function ComingSoonPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);

  /* ── Particle canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0;
    let particles: {
      x: number; y: number; size: number; speed: number;
      opacity: number; drift: number; color: string;
    }[] = [];
    let raf: number;

    function resize() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    function makeParticle(init: boolean) {
      const opacity = Math.random() * 0.18 + 0.04;
      return {
        x: Math.random() * W,
        y: init ? Math.random() * H : H + 10,
        size: Math.random() * 1.4 + 0.3,
        speed: Math.random() * 0.4 + 0.1,
        opacity,
        drift: (Math.random() - 0.5) * 0.25,
        color: Math.random() > 0.7
          ? `rgba(232,160,32,${opacity})`
          : `rgba(250,250,248,${opacity})`,
      };
    }

    function init() {
      resize();
      particles = Array.from({ length: 90 }, () => makeParticle(true));
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, "rgba(16,12,8,.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -4) Object.assign(p, makeParticle(false));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      raf = requestAnimationFrame(loop);
    }

    init();
    loop();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ── Custom cursor ── */
  useEffect(() => {
    const cur = cursorRef.current;
    if (!cur) return;
    function onMove(e: MouseEvent) {
      cur!.style.left = e.clientX + "px";
      cur!.style.top = e.clientY + "px";
    }
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  /* ── Escape key to close peek ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPeekOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ── Form submit ── */
  const handleSubmit = useCallback(async () => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email.trim())) {
      setError(true);
      setTimeout(() => setError(false), 1200);
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "coming-soon" }),
      });
    } catch {
      // silent — show success anyway
    }
    setLoading(false);
    setSubmitted(true);
  }, [email]);

  return (
    <>
      {/* Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,700;12..96,800&family=Geist:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; overflow: hidden; background: #16130C; color: #FAFAF8; font-family: 'Geist', sans-serif; -webkit-font-smoothing: antialiased; }
        body::before { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E"); background-size: 200px 200px; pointer-events: none; z-index: 100; opacity: .5; }
        @keyframes rise { to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes drawLine { to { width: 100%; } }
        @media (max-width: 600px) { .swoosh-wrap { display: none !important; } .form-input-cs { width: 100% !important; } .locale-cs { display: none !important; } html, body { overflow: auto; } .cat-grid-cs { grid-template-columns: 1fr 1fr !important; } }
      `}</style>

      {/* Ambient particle canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />

      {/* Custom cursor */}
      <div
        ref={cursorRef}
        style={{
          position: "fixed", width: 6, height: 6, background: "#E8A020",
          borderRadius: "50%", pointerEvents: "none", zIndex: 200,
          transform: "translate(-50%, -50%)", transition: "transform .08s ease",
          mixBlendMode: "screen",
        }}
      />

      {/* Swoosh decoration */}
      <div className="swoosh-wrap" style={{ position: "fixed", right: "-8vw", top: "50%", transform: "translateY(-50%)", zIndex: 1, opacity: 0, animation: "fadeIn 1.6s ease 1.2s forwards", pointerEvents: "none" }}>
        <svg viewBox="0 0 980 1100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "clamp(520px, 70vw, 980px)", height: "auto" }}>
          <path d="M 920 60 C 820 280, 340 380, 140 820" stroke="#E8A020" strokeWidth="52" strokeLinecap="round" fill="none" opacity=".07" filter="url(#glow)" />
          <path d="M 920 60 C 820 280, 340 380, 140 820" stroke="#E8A020" strokeWidth="28" strokeLinecap="round" fill="none" opacity=".55" strokeDasharray="1800" strokeDashoffset="1800" style={{ animation: "strokeDraw 2.2s cubic-bezier(.4,0,.2,1) 1.3s forwards" }} />
          <path d="M 920 60 C 820 280, 340 380, 140 820" stroke="#F5C842" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".9" strokeDasharray="1800" strokeDashoffset="1800" style={{ animation: "strokeDraw 2.2s cubic-bezier(.4,0,.2,1) 1.5s forwards" }} />
          <path d="M 880 110 C 770 320, 380 410, 190 840" stroke="#E8A020" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".18" strokeDasharray="1750" strokeDashoffset="1750" style={{ animation: "strokeDraw 2.2s cubic-bezier(.4,0,.2,1) 1.9s forwards" }} />
          <circle cx="920" cy="60" r="16" fill="#F5C842" opacity="0" style={{ animation: "fadeIn 0.5s ease 3.4s forwards" }} />
          <circle cx="920" cy="60" r="28" fill="#E8A020" opacity="0" style={{ animation: "fadeIn 0.5s ease 3.4s forwards" }} filter="url(#dotglow)" />
          <circle cx="140" cy="820" r="9" fill="#F5C842" opacity="0" style={{ animation: "fadeIn 0.5s ease 3.5s forwards" }} />
          <defs>
            <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="22" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="dotglow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <style>{`@keyframes strokeDraw { to { stroke-dashoffset: 0; } }`}</style>
        </svg>
      </div>

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 10, height: "100vh", display: "grid", gridTemplateRows: "1fr auto", padding: "clamp(32px, 5vw, 64px)" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", maxWidth: 680 }}>

          {/* Logotype */}
          <div style={{
            fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(13px, 1.4vw, 16px)",
            fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const,
            color: "#E8A020", marginBottom: "clamp(40px, 7vh, 72px)",
            opacity: 0, transform: "translateY(12px)", animation: "rise .9s cubic-bezier(.22,1,.36,1) .1s forwards",
          }}>
            Klickenya &nbsp;&middot;&nbsp; Kenya
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(44px, 8.5vw, 112px)",
            fontWeight: 800, lineHeight: 0.92, letterSpacing: "-.04em",
            color: "#FAFAF8", marginBottom: "clamp(24px, 3vh, 36px)",
          }}>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={{ display: "block", opacity: 0, transform: "translateY(105%)", animation: "slideUp .85s cubic-bezier(.22,1,.36,1) .22s forwards" }}>Discover</span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={{ display: "block", opacity: 0, transform: "translateY(105%)", animation: "slideUp .85s cubic-bezier(.22,1,.36,1) .34s forwards" }}>
                <em style={{ fontStyle: "normal", color: "#F5C842", position: "relative" }}>
                  Kenya
                  <span style={{ content: "''", position: "absolute", bottom: ".06em", left: 0, width: 0, height: ".06em", background: "#E8A020", borderRadius: 2, animation: "drawLine .7s cubic-bezier(.22,1,.36,1) 1.1s forwards", display: "block" }} />
                </em>{" "}like
              </span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={{ display: "block", opacity: 0, transform: "translateY(105%)", animation: "slideUp .85s cubic-bezier(.22,1,.36,1) .46s forwards" }}>never before.</span>
            </span>
          </h1>

          {/* Subline */}
          <p style={{
            fontSize: "clamp(14px, 1.6vw, 18px)", fontWeight: 300,
            color: "rgba(250,250,248,0.42)", lineHeight: 1.65, maxWidth: 460,
            opacity: 0, transform: "translateY(10px)", animation: "rise .9s cubic-bezier(.22,1,.36,1) .7s forwards",
            marginBottom: "clamp(32px, 5vh, 52px)",
          }}>
            Stays, experiences, events, services and more &mdash;
            all in one place, built for Kenya.
            Launching&nbsp;soon.
          </p>

          {/* Email form */}
          <div style={{ opacity: 0, transform: "translateY(10px)", animation: "rise .9s cubic-bezier(.22,1,.36,1) .85s forwards" }}>
            {!submitted ? (
              <>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const }}>
                  <input
                    className="form-input-cs"
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                    style={{
                      background: "rgba(250,250,248,.06)", border: `1px solid ${error ? "rgba(220,38,38,.6)" : "rgba(250,250,248,.12)"}`,
                      borderRadius: 50, padding: "13px 22px", fontFamily: "'Geist', sans-serif",
                      fontSize: 16, color: "#FAFAF8", outline: "none", width: 260,
                      transition: "border-color .25s, background .25s",
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      background: "#E8A020", color: "#16130C", border: "none", borderRadius: 50,
                      padding: "13px 26px", fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: 14, fontWeight: 800, letterSpacing: ".01em", cursor: "pointer",
                      transition: "transform .2s, background .2s, box-shadow .2s", whiteSpace: "nowrap" as const,
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? "..." : "Notify me"}
                  </button>
                </div>
                <p style={{ marginTop: 12, fontSize: 12, color: "rgba(250,250,248,.22)", letterSpacing: ".01em" }}>
                  Be first to know when we go live. No spam, ever.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 14, color: "#F5C842", fontWeight: 500 }}>
                &#10022; &nbsp;You&apos;re on the list. We&apos;ll be in touch.
              </p>
            )}
          </div>

          {/* Peek button */}
          <button
            onClick={() => setPeekOpen(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginTop: 20,
              background: "none", border: "1px solid rgba(250,250,248,.14)", borderRadius: 50,
              padding: "9px 18px 9px 14px", fontFamily: "'Geist', sans-serif", fontSize: 13,
              fontWeight: 400, color: "rgba(250,250,248,.45)", cursor: "pointer",
              transition: "border-color .25s, color .25s, background .25s", letterSpacing: ".01em",
              opacity: 0, animation: "rise .9s cubic-bezier(.22,1,.36,1) 1s forwards",
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: "50%", background: "rgba(232,160,32,.15)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
              transition: "background .25s, transform .3s",
            }}>
              &#10022;
            </span>
            Curious? Sneak peek inside
          </button>

        </div>

        {/* Bottom */}
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24,
          opacity: 0, animation: "rise .9s cubic-bezier(.22,1,.36,1) 1.1s forwards",
        }}>
          <div className="locale-cs" style={{ fontSize: 12, color: "rgba(250,250,248,.2)", letterSpacing: ".04em", textAlign: "right" as const, flexShrink: 0 }}>
            <strong style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(250,250,248,.35)", marginBottom: 2 }}>
              &#x1F1F0;&#x1F1EA; &nbsp;Made for Kenya
            </strong>
            Watamu &middot; Nairobi &middot; Diani &middot; Kilifi &middot; Lamu
          </div>
        </div>
      </div>

      {/* PEEK OVERLAY */}
      {peekOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50, display: "flex",
            alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={() => setPeekOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(16,13,8,.88)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
          />
          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, color: "#FAFAF8", letterSpacing: "-.03em", lineHeight: 1 }}>
                Everything in <span style={{ color: "#F5C842" }}>one place.</span>
              </div>
              <button
                onClick={() => setPeekOpen(false)}
                style={{
                  width: 38, height: 38, borderRadius: "50%", background: "rgba(250,250,248,.07)",
                  border: "1px solid rgba(250,250,248,.12)", color: "rgba(250,250,248,.5)",
                  fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0, lineHeight: 1,
                }}
              >
                &#10005;
              </button>
            </div>
            <div className="cat-grid-cs" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
              {[
                { emoji: "\u{1F3E0}", name: "Stays", subs: "Villas \u00b7 Boutique hotels \u00b7 Lodges & camps \u00b7 Unique stays \u00b7 Hostels" },
                { emoji: "\u{1F981}", name: "Safari", subs: "Game drives \u00b7 Walking safaris \u00b7 Night drives \u00b7 Boat safaris \u00b7 Fly-in" },
                { emoji: "\u{1F30A}", name: "Outdoor", subs: "Diving \u00b7 Surfing \u00b7 Hiking \u00b7 Kayaking \u00b7 Zip-lining \u00b7 Cycling" },
                { emoji: "\u{1F37D}\uFE0F", name: "Restaurants", subs: "Fine dining \u00b7 Rooftop \u00b7 Street food \u00b7 Food tours \u00b7 Tastings" },
                { emoji: "\u{1F39F}", name: "Events", subs: "Festivals \u00b7 Parties \u00b7 Art & culture \u00b7 Networking \u00b7 Kids events" },
                { emoji: "\u{1F9D8}", name: "Wellness", subs: "Yoga retreats \u00b7 Spa days \u00b7 Meditation \u00b7 Personal training \u00b7 Holistic" },
                { emoji: "\u{1F697}", name: "Rentals", subs: "Car hire \u00b7 4WD \u00b7 Boats \u00b7 Bikes \u00b7 Camping gear \u00b7 Dive gear" },
                { emoji: "\u2B50", name: "Services", subs: "Transfers \u00b7 Private chef \u00b7 Fundis \u00b7 IT & marketing \u00b7 Pharmacy" },
                { emoji: "\u{1F3DB}\uFE0F", name: "Cultural", subs: "Heritage tours \u00b7 Craft workshops \u00b7 Community visits \u00b7 Music & dance" },
                { emoji: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", name: "Family", subs: "Kid-friendly \u00b7 Educational \u00b7 Animal encounters \u00b7 Holiday camps" },
                { emoji: "\u{1F3E2}", name: "Real Estate", subs: "For sale \u00b7 Land & plots \u00b7 New developments \u00b7 Commercial" },
              ].map((cat) => (
                <div key={cat.name} style={{
                  padding: "18px 20px 16px", borderRadius: 16,
                  border: "1px solid rgba(250,250,248,.08)", background: "rgba(250,250,248,.04)",
                  cursor: "default", transition: "background .25s, border-color .25s, transform .25s",
                }}>
                  <span style={{ fontSize: 24, marginBottom: 10, display: "block" }}>{cat.emoji}</span>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: "#FAFAF8", letterSpacing: "-.02em", marginBottom: 5 }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(250,250,248,.32)", lineHeight: 1.5 }}>
                    {cat.subs}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "rgba(250,250,248,.2)" }}>
              More categories launching at klickenya.com &nbsp;&middot;&nbsp; Kenya-first, always
            </p>
          </div>
        </div>
      )}
    </>
  );
}
