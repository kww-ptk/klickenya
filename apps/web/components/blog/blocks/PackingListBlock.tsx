'use client'

import { useState, useEffect } from 'react'

interface PackItem { icon?: string; text?: string }
interface PackingListValue { title?: string; items?: PackItem[] }

export function PackingListBlock({ value, slug }: { value: PackingListValue; slug?: string }) {
  const { title = 'Packing List', items = [] } = value
  const storageKey = `packing-${slug || 'default'}`
  const [checked, setChecked] = useState<boolean[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setChecked(JSON.parse(saved))
      else setChecked(new Array(items.length).fill(false))
    } catch {
      setChecked(new Array(items.length).fill(false))
    }
  }, [items.length, storageKey])

  const toggle = (i: number) => {
    const next = [...checked]
    next[i] = !next[i]
    setChecked(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }

  const count = checked.filter(Boolean).length
  const pct = items.length > 0 ? (count / items.length) * 100 : 0

  if (checked.length === 0) return null

  return (
    <div className="my-10">
      {title && <h3 className="font-[family-name:'Bricolage_Grotesque'] text-[22px] font-bold text-[#18160F] tracking-tight mb-4">{title}</h3>}
      <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-[16px] border text-[14px] text-left select-none cursor-pointer transition-colors ${
              checked[i]
                ? 'bg-[rgba(13,115,119,.08)] border-[rgba(13,115,119,.2)] text-[#18160F] line-through decoration-[#0D7377]'
                : 'bg-[#F4F2EE] border-[#E4E0D8] text-[#5C574E] hover:bg-[#EDEAE4]'
            }`}
          >
            <span className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] shrink-0 flex items-center justify-center transition-all ${
              checked[i] ? 'bg-[#0D7377] border-[#0D7377]' : 'border-[#D5D0C7]'
            }`}>
              {checked[i] && <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m5 13 4 4L19 7"/></svg>}
            </span>
            {item.icon && <span className="text-[16px] shrink-0">{item.icon}</span>}
            <span>{item.text}</span>
          </button>
        ))}
      </div>
      <div className="h-1 bg-[#E4E0D8] rounded-sm mt-3.5 overflow-hidden">
        <div className="h-full bg-[#0D7377] rounded-sm transition-[width] duration-400 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[12.5px] text-[#9B9589] mt-1.5 font-medium">{count} of {items.length} packed</p>
    </div>
  )
}
