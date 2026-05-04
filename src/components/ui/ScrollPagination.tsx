'use client'

import { useEffect, useRef, useState } from 'react'

interface ScrollPaginationProps {
  hasMore: boolean
  onLoadMore: () => void
  threshold?: number
}

export default function ScrollPagination({
  hasMore,
  onLoadMore,
  threshold = 160,
}: ScrollPaginationProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const loadingRef = useRef(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasMore) return

    const loadWhenNearSentinel = () => {
      const sentinel = sentinelRef.current
      if (!sentinel || loadingRef.current) return

      const sentinelTop = sentinel.getBoundingClientRect().top
      const isNearViewport = sentinelTop <= window.innerHeight + threshold
      if (!isNearViewport) return

      loadingRef.current = true
      setLoading(true)
      onLoadMore()
      frameRef.current = window.requestAnimationFrame(() => {
        loadingRef.current = false
        setLoading(false)
        frameRef.current = null
      })
    }

    window.addEventListener('scroll', loadWhenNearSentinel, { passive: true })

    return () => {
      window.removeEventListener('scroll', loadWhenNearSentinel)
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      loadingRef.current = false
    }
  }, [hasMore, onLoadMore, threshold])

  if (!hasMore) return null

  return (
    <div ref={sentinelRef} className="flex min-h-12 items-center justify-center py-3" aria-live="polite" aria-busy={loading}>
      {loading && (
        <span className="inline-flex items-center gap-1" aria-label="Caricamento altri elementi">
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            <span className="scroll-loader-dot" />
            <span className="scroll-loader-dot" />
            <span className="scroll-loader-dot" />
          </span>
        </span>
      )}
    </div>
  )
}
