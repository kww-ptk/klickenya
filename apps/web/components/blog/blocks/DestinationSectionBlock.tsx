interface DestinationSectionValue { number?: number; pill?: string; pillColor?: 'teal' | 'blue' | 'purple'; title?: string }

const pillStyles = {
  teal: 'bg-[rgba(13,115,119,.12)] text-[#0D7377] border-[rgba(13,115,119,.2)]',
  blue: 'bg-[rgba(37,99,235,.1)] text-[#2563EB] border-[rgba(37,99,235,.2)]',
  purple: 'bg-[rgba(139,77,171,.10)] text-[#8B4DAB] border-[rgba(139,77,171,.2)]',
}

export function DestinationSectionBlock({ value }: { value: DestinationSectionValue }) {
  const { number, pill, pillColor = 'teal', title } = value
  return (
    <div className="flex items-center gap-3.5 mb-5 mt-14">
      <div className="font-[family-name:'Bricolage_Grotesque'] text-[48px] font-extrabold leading-none text-[#D5D0C7] tracking-tight">
        {String(number ?? 0).padStart(2, '0')}
      </div>
      <div>
        {pill && (
          <span className={`inline-block py-1.5 px-4 rounded-full text-[12px] font-extrabold uppercase tracking-[.06em] border ${pillStyles[pillColor]}`}>
            {pill}
          </span>
        )}
        {title && (
          <h2 className="font-[family-name:'Bricolage_Grotesque'] text-[clamp(28px,3.5vw,42px)] font-extrabold text-[#18160F] tracking-tight leading-[1.1] mt-2">
            {title}
          </h2>
        )}
      </div>
    </div>
  )
}
