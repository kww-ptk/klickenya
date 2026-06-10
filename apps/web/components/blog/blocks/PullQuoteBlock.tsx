interface PullQuoteValue { text?: string; attribution?: string; accentColor?: 'amber' | 'purple' }

export function PullQuoteBlock({ value }: { value: PullQuoteValue }) {
  const { text, attribution, accentColor = 'amber' } = value
  const quoteColor = accentColor === 'purple' ? 'text-purple2' : 'text-amber'
  return (
    <div className="my-12 py-8 px-9 rounded-[30px] bg-[#F4F2EE] border border-[#E4E0D8] relative overflow-hidden">
      <span className={`absolute -top-5 left-6 font-[family-name:'Lora'] text-[140px] font-bold ${quoteColor} opacity-15 leading-none select-none`}>&ldquo;</span>
      {text && <p className="font-[family-name:'Lora'] text-[22px] leading-[1.65] text-[#18160F] italic font-medium relative z-10">{text}</p>}
      {attribution && <cite className="block mt-3.5 font-[family-name:'Geist'] text-[13px] font-bold text-[#9B9589] tracking-[.02em] not-italic">{attribution}</cite>}
    </div>
  )
}
