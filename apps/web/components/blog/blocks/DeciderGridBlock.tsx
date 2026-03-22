interface DeciderCard { label?: string; color?: string; title?: string; items?: string[] }
interface DeciderGridValue { cards?: DeciderCard[] }

const cardStyles: Record<string, { bg: string; border: string; label: string }> = {
  teal: { bg: 'bg-[rgba(13,115,119,.06)]', border: 'border-[rgba(13,115,119,.2)]', label: 'text-[#0D7377]' },
  blue: { bg: 'bg-[rgba(37,99,235,.05)]', border: 'border-[rgba(37,99,235,.18)]', label: 'text-[#2563EB]' },
  purple: { bg: 'bg-[rgba(139,77,171,.10)]', border: 'border-[rgba(139,77,171,.2)]', label: 'text-[#8B4DAB]' },
  amber: { bg: 'bg-[rgba(232,160,32,.08)]', border: 'border-[rgba(232,160,32,.2)]', label: 'text-[#B8860B]' },
}

export function DeciderGridBlock({ value }: { value: DeciderGridValue }) {
  const { cards = [] } = value
  return (
    <div className={`grid gap-3.5 my-5 mb-9 max-md:grid-cols-1 ${cards.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'}`}>
      {cards.map((card, i) => {
        const s = cardStyles[card.color || 'teal']
        return (
          <div key={i} className={`p-[22px] px-5 rounded-[22px] border ${s.bg} ${s.border} transition-all hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.03)]`}>
            {card.label && <p className={`text-[11px] font-extrabold uppercase tracking-[.07em] mb-2.5 ${s.label}`}>{card.label}</p>}
            {card.title && <p className="font-[family-name:'Bricolage_Grotesque'] text-[17px] font-bold text-[#18160F] tracking-tight mb-2.5">{card.title}</p>}
            <ul className="flex flex-col gap-[5px]">
              {(card.items ?? []).map((item, j) => (
                <li key={j} className="text-[13px] text-[#5C574E] flex gap-[7px] leading-[1.4]">
                  <span className="text-[#9B9589] shrink-0">→</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
