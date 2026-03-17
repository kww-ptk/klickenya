export default function Loading() {
  return (
    <main className="bg-white min-h-screen flex flex-col items-center justify-center relative">
      {/* Amber shimmer progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-zinc-100 overflow-hidden z-50">
        <div
          className="h-full w-1/3 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #f59e0b, #d97706, #f59e0b, transparent)",
            animation: "shimmerBar 1.5s ease-in-out infinite",
          }}
        />
      </div>

      {/* Centered logo text */}
      <div className="animate-pulse">
        <span
          className="font-[family-name:var(--font-bricolage)] text-[clamp(28px,5vw,40px)] font-bold tracking-[-0.03em]"
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Klickenya
        </span>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes shimmerBar {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `,
        }}
      />
    </main>
  );
}
