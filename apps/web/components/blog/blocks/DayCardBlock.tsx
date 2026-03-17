'use client'

import { useState } from 'react'

interface TimelineItem { time?: string; title?: string; description?: string; badge?: string }
interface DayCardValue { dayNumber?: number; location?: string; title?: string; meta?: string; timeline?: TimelineItem[]; costs?: string[] }

export function DayCardBlock({ value }: { value: DayCardValue }) {
  const [open, setOpen] = useState(false)
  const { dayNumber, location, title, meta, timeline = [], costs = [] } = value

  return (
    <div className={`my-8 border border-[#E4E0D8] rounded-[30px] overflow-hidden transition-shadow duration-300 ${open ? 'shadow-[0_8px_28px_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.03)]' : 'hover:shadow-[0_8px_28px_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.03)]'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-0 bg-white hover:bg-[#F4F2EE] transition-colors"
      >
        <div className="w-20 shrink-0 py-[22px] px-5 bg-[#18160F] text-center">
          <div className="text-[9.5px] font-extrabold tracking-[.1em] uppercase text-white/35 mb-1">Day</div>
          <div className="font-[family-name:'Bricolage_Grotesque'] text-[28px] font-extrabold text-white leading-none tracking-tight">{dayNumber}</div>
        </div>
        <div className="flex-1 py-[22px] px-6 text-left">
          {location && <div className="text-[11px] font-extrabold tracking-[.08em] uppercase text-[#E8A020] mb-1">{location}</div>}
          <div className="font-[family-name:'Bricolage_Grotesque'] text-[18px] font-bold text-[#18160F] tracking-tight">{title}</div>
          {meta && <div className="text-[13px] text-[#9B9589] mt-1">{meta}</div>}
        </div>
        <div className={`py-[22px] px-5 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          <svg width="18" height="18" fill="none" stroke="#9B9589" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </button>
      <div
        className="bg-white overflow-hidden transition-all duration-400 ease-in-out"
        style={{ maxHeight: open ? '600px' : '0', padding: open ? '24px 24px 28px' : '0 24px', borderTop: open ? '1px solid #E4E0D8' : 'none' }}
      >
        <div className="flex flex-col">
          {timeline.map((item, i) => (
            <div key={i} className="flex gap-4 py-3">
              <div className="shrink-0 text-[12px] font-bold text-[#E8A020] min-w-[65px] pt-px">{item.time}</div>
              <div>
                <div className="text-[14.5px] font-bold text-[#18160F] mb-0.5">{item.title}</div>
                {item.description && <div className="text-[13.5px] text-[#5C574E] leading-[1.6]">{item.description}</div>}
                {item.badge && (
                  <span className="inline-flex items-center gap-1 bg-[#EDEAE4] rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[#5C574E] mt-1.5">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {costs.length > 0 && (
          <div className="flex gap-3 flex-wrap mt-4 pt-4 border-t border-[#E4E0D8]">
            {costs.map((cost, i) => (
              <span key={i} className="py-[5px] px-[13px] rounded-full text-[12px] font-bold bg-[#F4F2EE] border border-[#E4E0D8] text-[#5C574E]">
                {cost}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
