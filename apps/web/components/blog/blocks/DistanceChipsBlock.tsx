interface DistChip { icon?: 'pin' | 'clock'; text?: string }
interface DistanceChipsValue { chips?: DistChip[] }

const PinIcon = () => (
  <svg className="w-[13px] h-[13px] shrink-0 text-[#8B4DAB]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 1.5A4.5 4.5 0 003.5 6c0 3 4.5 8.5 4.5 8.5S12.5 9 12.5 6A4.5 4.5 0 008 1.5z"/>
    <circle cx="8" cy="6" r="1.5"/>
  </svg>
)
const ClockIcon = () => (
  <svg className="w-[13px] h-[13px] shrink-0 text-[#8B4DAB]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/>
  </svg>
)

export function DistanceChipsBlock({ value }: { value: DistanceChipsValue }) {
  const { chips = [] } = value
  return (
    <div className="flex gap-3 my-5 mb-8 flex-wrap">
      {chips.map((chip, i) => (
        <div key={i} className="flex items-center gap-2 py-2 px-4 rounded-full bg-[#F4F2EE] border border-[#E4E0D8] text-[13px] font-semibold text-[#5C574E]">
          {chip.icon === 'clock' ? <ClockIcon /> : <PinIcon />}
          {chip.text}
        </div>
      ))}
    </div>
  )
}
