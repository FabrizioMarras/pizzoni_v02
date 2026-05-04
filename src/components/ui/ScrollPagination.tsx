'use client'

import { useEffect, useRef, useState } from 'react'

interface ScrollPaginationProps {
  hasMore: boolean
  onLoadMore: () => void
  rootMargin?: string
}

export default function ScrollPagination({
  hasMore,
  onLoadMore,
  rootMargin = '240px 0px',
}: ScrollPaginationProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const intersectingRef = useRef(false)
  const loadingRef = useRef(false)
  const [armed, setArmed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasMore || armed) return

    const armPagination = () => setArmed(true)
    const armPaginationFromKey = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' '].includes(event.key)) {
        setArmed(true)
      }
    }

    window.addEventListener('scroll', armPagination, { once: true, passive: true })
    window.addEventListener('wheel', armPagination, { once: true, passive: true })
    window.addEventListener('touchmove', armPagination, { once: true, passive: true })
    window.addEventListener('keydown', armPaginationFromKey)

    return () => {
      window.removeEventListener('scroll', armPagination)
      window.removeEventListener('wheel', armPagination)
      window.removeEventListener('touchmove', armPagination)
      window.removeEventListener('keydown', armPaginationFromKey)
    }
  }, [armed, hasMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || !armed) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          intersectingRef.current = false
          return
        }

        if (intersectingRef.current || loadingRef.current) return

        intersectingRef.current = true
        loadingRef.current = true
        setLoading(true)
        onLoadMore()
        frameRef.current = window.requestAnimationFrame(() => {
          loadingRef.current = false
          setLoading(false)
          frameRef.current = null
        })
      },
      { rootMargin }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      intersectingRef.current = false
      loadingRef.current = false
    }
  }, [armed, hasMore, onLoadMore, rootMargin])

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
