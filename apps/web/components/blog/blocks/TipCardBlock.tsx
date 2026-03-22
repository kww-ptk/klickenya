import Link from "next/link";

interface TipCardValue {
  variant?: "tip" | "warning" | "teal" | "purple" | "amber" | "cta";
  icon?: string;
  label?: string;
  text?: string;
  tip?: string;
  ctaLink?: string;
  ctaButtonText?: string;
}

export function TipCardBlock({ value }: { value: TipCardValue }) {
  const { variant = "tip", icon = "💡", label, tip } = value;
  // Support both 'text' and 'tip' fields
  const text = value.text || tip;

  // CTA variant — branded card with button
  if (variant === "cta" || (label && label.toLowerCase().includes("got an event"))) {
    return (
      <div className="my-10 relative overflow-hidden rounded-[22px] border border-[#E8A020]/25 bg-gradient-to-br from-[#E8A020]/[0.06] to-[#6b2d8b]/[0.04]">
        {/* Decorative swoosh */}
        <svg
          className="absolute -right-10 -top-10 w-[240px] h-[240px] opacity-[0.06] pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="90" stroke="#E8A020" strokeWidth="30" />
        </svg>

        <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1">
            <p className="text-[18px] font-bold text-[#16130C] mb-2">
              {label || "List your event on Klickenya"}
            </p>
            <p className="text-[14px] text-[#5E5848] leading-[1.65]">
              {text || "Reach thousands of visitors every month — for free."}
            </p>
          </div>
          <Link
            href={value.ctaLink || "/how-it-works"}
            className="shrink-0 inline-flex items-center gap-2 bg-[#E8A020] text-[#16130C] font-bold text-[14px] px-6 py-3 rounded-full hover:bg-[#d4910e] transition-colors"
          >
            List your space
            <span className="text-[16px]">→</span>
          </Link>
        </div>
      </div>
    );
  }

  const styles: Record<string, { bg: string; border: string; label: string }> = {
    tip: {
      bg: "bg-[rgba(232,160,32,.11)]",
      border: "border-[rgba(232,160,32,.2)]",
      label: "text-[#E8A020]",
    },
    warning: {
      bg: "bg-[rgba(220,38,38,.06)]",
      border: "border-[rgba(220,38,38,.2)]",
      label: "text-[#DC2626]",
    },
    teal: {
      bg: "bg-[rgba(13,115,119,.08)]",
      border: "border-[rgba(13,115,119,.2)]",
      label: "text-[#0D7377]",
    },
    purple: {
      bg: "bg-[rgba(139,77,171,.10)]",
      border: "border-[rgba(139,77,171,.2)]",
      label: "text-[#8B4DAB]",
    },
    amber: {
      bg: "bg-[rgba(232,160,32,.11)]",
      border: "border-[rgba(232,160,32,.2)]",
      label: "text-[#B8860B]",
    },
  };
  const s = styles[variant] ?? styles.tip;

  return (
    <div
      className={`my-8 p-5 px-6 rounded-[22px] ${s.bg} border-[1.5px] ${s.border} flex gap-3.5 items-start`}
    >
      <span className="text-[20px] shrink-0 mt-0.5">{icon}</span>
      <div>
        {label && (
          <p
            className={`text-[11px] font-extrabold tracking-[.07em] uppercase ${s.label} mb-1.5`}
          >
            {label}
          </p>
        )}
        {text && (
          <p className="text-[14.5px] text-[#5C574E] leading-[1.65]">{text}</p>
        )}
      </div>
    </div>
  );
}
