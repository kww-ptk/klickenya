'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect, useRef } from 'react'
import {
  SUBCATEGORIES_BY_TYPE,
  SUBCATEGORY_LABELS,
  SUBCATEGORY_ICONS,
} from '@/lib/constants/subcategories'
import { cn } from '@/lib/utils'

interface SubcategoryBarProps {
  type: string
  activeSubcategory: string | null
  counts?: Record<string, number>
}

export default function SubcategoryBar({
  type,
  activeSubcategory,
  counts,
}: SubcategoryBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const subcategories = SUBCATEGORIES_BY_TYPE[type]

  /* ── Sync with CategoryNav hide/show ── */
  const [stickyTop, setStickyTop] = useState(68)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const isMd = window.innerWidth >= 768
    // CategoryNav is ~72px tall, only on md+
    const catNavH = isMd ? 72 : 0

    function handleScroll() {
      const currentY = window.scrollY
      if (currentY < 100) {
        setStickyTop(68 + catNavH)
      } else if (currentY > lastScrollY.current + 5) {
        setStickyTop(68) // CategoryNav hidden
      } else if (currentY < lastScrollY.current - 5) {
        setStickyTop(68 + catNavH) // CategoryNav visible
      }
      lastScrollY.current = currentY
    }

    // Set initial value
    setStickyTop(68 + catNavH)

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = useCallback(
    (sub: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (sub) {
        params.set('sub', sub)
      } else {
        params.delete('sub')
      }
      const qs = params.toString()
      router.push(`${window.location.pathname}${qs ? `?${qs}` : ''}`, {
        scroll: false,
      })
    },
    [router, searchParams]
  )

  if (!subcategories || subcategories.length === 0) return null

  return (
    <div
      className="sticky z-30 bg-white border-b border-border"
      style={{ top: `${stickyTop}px`, transition: 'top 300ms ease' }}
    >
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-4 md:px-10 py-2.5">
        {/* All pill */}
        <button
          onClick={() => handleClick(null)}
          className={cn(
            'shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
            !activeSubcategory
              ? 'bg-amber text-dark'
              : 'bg-surface text-text2 hover:bg-surface2'
          )}
        >
          ✨ All
        </button>

        {subcategories.map((sub) => {
          const isActive = activeSubcategory === sub
          const icon = SUBCATEGORY_ICONS[sub]
          const label = SUBCATEGORY_LABELS[sub] ?? sub
          const count = counts?.[sub]

          return (
            <button
              key={sub}
              onClick={() => handleClick(sub)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-amber text-dark'
                  : 'bg-surface text-text2 hover:bg-surface2'
              )}
            >
              {icon && <span className="text-[15px]">{icon}</span>}
              {label}
              {count != null && count > 0 && (
                <span className="ml-0.5 rounded-full bg-border px-1.5 py-px text-[10px] font-medium text-text2">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
