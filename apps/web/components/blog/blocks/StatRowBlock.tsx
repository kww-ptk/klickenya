interface StatItem { number?: string; label?: string }
interface StatRowValue { stats?: StatItem[] }

export function StatRowBlock({ value }: { value: StatRowValue }) {
  const { stats = [] } = value
  return (
    <div className="grid grid-cols-3 gap-4 my-10 max-md:grid-cols-2 max-sm:grid-cols-1">
      {stats.map((stat, i) => (
        <div key={i} className="p-6 rounded-[22px] border border-[#E4E0D8] bg-white text-center transition-all duration-300 hover:shadow-[0_2px_10px_rgba(0,0,0,.06),0_0_0_1px_rgba(0,0,0,.03)] hover:-translate-y-0.5">
          <div className="font-[family-name:'Bricolage_Grotesque'] text-[36px] font-extrabold text-[#18160F] tracking-tight leading-none mb-1.5">{stat.number}</div>
          <div className="text-[13px] text-[#5C574E]">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
