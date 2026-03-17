interface QuickFactsItem { icon?: string; label?: string; value?: string }
interface QuickFactsValue { title?: string; accentColor?: 'amber' | 'purple' | 'teal'; items?: QuickFactsItem[] }

export function QuickFactsBlock({ value }: { value: QuickFactsValue }) {
  const { title = '✦ Quick Facts', accentColor = 'amber', items = [] } = value
  const colorMap = { amber: 'text-[#E8A020]', purple: 'text-[#8B4DAB]', teal: 'text-[#0D7377]' }
  return (
    <div className="bg-[#18160F] rounded-[30px] p-8 my-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(232,160,32,.12),transparent_60%),radial-gradient(ellipse_at_20%_80%,rgba(13,115,119,.08),transparent_60%)]" />
      <div className="relative z-10">
        <p className={`font-[family-name:'Bricolage_Grotesque'] text-[13px] font-extrabold tracking-[.08em] uppercase ${colorMap[accentColor]} mb-5`}>
          {title}
        </p>
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2">
          {items.map((item, i) => (
            <div key={i} className="p-4 bg-white/[.04] border border-white/[.06] rounded-[16px]">
              {item.icon && <div className="text-[22px] mb-2">{item.icon}</div>}
              {item.label && <div className="text-[11px] font-bold text-white/35 uppercase tracking-[.05em] mb-1">{item.label}</div>}
              {item.value && <div className="text-[15px] font-bold text-white">{item.value}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
