'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { cn } from '@/lib/utils'

interface TagFilterProps {
  availableTags: string[]
  activeTags: string[]
}

export default function TagFilter({
  availableTags,
  activeTags,
}: TagFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleToggle = useCallback(
    (tag: string) => {
      const params = new URLSearchParams(searchParams.toString())
      const current = new Set(activeTags)

      if (current.has(tag)) {
        current.delete(tag)
      } else {
        current.add(tag)
      }

      if (current.size > 0) {
        params.set('tags', Array.from(current).sort().join(','))
      } else {
        params.delete('tags')
      }

      const qs = params.toString()
      router.push(`${window.location.pathname}${qs ? `?${qs}` : ''}`, {
        scroll: false,
      })
    },
    [router, searchParams, activeTags]
  )

  const handleClear = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tags')
    const qs = params.toString()
    router.push(`${window.location.pathname}${qs ? `?${qs}` : ''}`, {
      scroll: false,
    })
  }, [router, searchParams])

  if (availableTags.length < 3) return null

  const sorted = [...availableTags].sort().slice(0, 12)
  const hasActive = activeTags.length > 0

  return (
    <div className="bg-surface">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-4 md:px-10 py-2">
        {sorted.map((tag) => {
          const isActive = activeTags.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => handleToggle(tag)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'border-amber bg-amber/10 text-dark'
                  : 'border-border bg-white text-text2 hover:border-text3'
              )}
            >
              {tag}
            </button>
          )
        })}

        {hasActive && (
          <button
            onClick={handleClear}
            className="shrink-0 ml-auto text-xs text-text3 hover:text-text transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
