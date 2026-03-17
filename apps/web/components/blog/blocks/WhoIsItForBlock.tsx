interface WhoItem { icon?: string; text?: string }
interface WhoIsItForValue { title?: string; items?: WhoItem[] }

export function WhoIsItForBlock({ value }: { value: WhoIsItForValue }) {
  const { title = '🎯 Perfect for...', items = [] } = value
  return (
    <div className="rounded-[30px] p-7 my-7 border border-[#E4E0D8] bg-white">
      <p className="font-[family-name:'Bricolage_Grotesque'] text-[17px] font-bold text-[#18160F] tracking-tight mb-4 flex items-center gap-2.5">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[13.5px] text-[#5C574E] py-2 px-3 bg-[#F4F2EE] rounded-[10px]">
            {item.icon && <span className="text-[16px] shrink-0">{item.icon}</span>}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
