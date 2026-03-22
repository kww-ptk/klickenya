interface TipCardValue { variant?: 'tip' | 'warning' | 'teal' | 'purple' | 'amber'; icon?: string; label?: string; text?: string }

export function TipCardBlock({ value }: { value: TipCardValue }) {
  const { variant = 'tip', icon = '💡', label, text } = value
  const styles: Record<string, { bg: string; border: string; label: string }> = {
    tip: { bg: 'bg-[rgba(232,160,32,.11)]', border: 'border-[rgba(232,160,32,.2)]', label: 'text-[#E8A020]' },
    warning: { bg: 'bg-[rgba(220,38,38,.06)]', border: 'border-[rgba(220,38,38,.2)]', label: 'text-[#DC2626]' },
    teal: { bg: 'bg-[rgba(13,115,119,.08)]', border: 'border-[rgba(13,115,119,.2)]', label: 'text-[#0D7377]' },
    purple: { bg: 'bg-[rgba(139,77,171,.10)]', border: 'border-[rgba(139,77,171,.2)]', label: 'text-[#8B4DAB]' },
    amber: { bg: 'bg-[rgba(232,160,32,.11)]', border: 'border-[rgba(232,160,32,.2)]', label: 'text-[#B8860B]' },
  }
  const s = styles[variant] ?? styles.tip
  return (
    <div className={`my-8 p-5 px-6 rounded-[22px] ${s.bg} border-[1.5px] ${s.border} flex gap-3.5 items-start`}>
      <span className="text-[20px] shrink-0 mt-0.5">{icon}</span>
      <div>
        {label && <p className={`text-[11px] font-extrabold tracking-[.07em] uppercase ${s.label} mb-1.5`}>{label}</p>}
        {text && <p className="text-[14.5px] text-[#5C574E] leading-[1.65]">{text}</p>}
      </div>
    </div>
  )
}
