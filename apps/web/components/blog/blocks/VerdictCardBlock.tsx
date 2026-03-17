interface VerdictCardValue { variant?: 'teal' | 'blue' | 'purple' | 'amber'; label?: string; title?: string; pros?: string[]; cons?: string[] }

const variantStyles = {
  teal: { bg: 'bg-[rgba(13,115,119,.06)]', border: 'border-[rgba(13,115,119,.2)]', label: 'text-[#0D7377]' },
  blue: { bg: 'bg-[rgba(37,99,235,.05)]', border: 'border-[rgba(37,99,235,.18)]', label: 'text-[#2563EB]' },
  purple: { bg: 'bg-[rgba(139,77,171,.10)]', border: 'border-[rgba(139,77,171,.2)]', label: 'text-[#8B4DAB]' },
  amber: { bg: 'bg-[rgba(232,160,32,.08)]', border: 'border-[rgba(232,160,32,.2)]', label: 'text-[#E8A020]' },
}

export function VerdictCardBlock({ value }: { value: VerdictCardValue }) {
  const { variant = 'teal', label, title, pros = [], cons = [] } = value
  const s = variantStyles[variant]
  return (
    <div className={`rounded-[30px] p-7 my-7 border ${s.bg} ${s.border}`}>
      {label && <p className={`text-[11px] font-extrabold tracking-[.08em] uppercase ${s.label} mb-2.5`}>{label}</p>}
      {title && <p className="font-[family-name:'Bricolage_Grotesque'] text-[20px] font-bold text-[#18160F] tracking-tight mb-2.5">{title}</p>}
      <div className="grid grid-cols-2 gap-4 mt-3.5 max-md:grid-cols-1">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[.05em] text-[#9B9589] mb-1.5">👍 Reasons to go</p>
          <ul className="flex flex-col gap-[7px]">
            {pros.map((p, i) => (
              <li key={i} className="text-[13.5px] text-[#5C574E] flex gap-2 items-start leading-[1.5]">
                <span className="text-[#0D7377] font-extrabold shrink-0">✓</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[.05em] text-[#9B9589] mb-1.5">👎 Think twice if...</p>
          <ul className="flex flex-col gap-[7px]">
            {cons.map((c, i) => (
              <li key={i} className="text-[13.5px] text-[#5C574E] flex gap-2 items-start leading-[1.5]">
                <span className="text-[#DC2626] font-extrabold shrink-0">✗</span>{c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
