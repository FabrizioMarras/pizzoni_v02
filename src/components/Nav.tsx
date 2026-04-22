'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import { FiBookOpen, FiCalendar, FiHome, FiLogOut, FiMapPin, FiMenu, FiUser, FiX } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'

const items = [
  { href: '/', label: 'Classifica', icon: FiHome },
  { href: '/pizzerie', label: 'Pizzerie', icon: FiMapPin },
  { href: '/eventi', label: 'Eventi', icon: FiCalendar },
  { href: '/guida', label: 'Guida', icon: FiBookOpen },
  { href: '/profilo', label: 'Profilo', icon: FiUser },
] satisfies Array<{ href: string; label: string; icon: IconType }>

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = ''
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen])

  const logout = async () => {
    await supabase.auth.signOut()
    setMobileOpen(false)
    router.push('/accedi')
  }

  return (
    <nav className="top-nav">
      <div className="mx-auto flex w-[min(1180px,100%-1.5rem)] flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/" className="font-semibold tracking-tight text-[var(--ink)]">
          <span className="text-xl">🍕</span>
          <span className="ml-2 text-2xl" style={{ fontFamily: 'var(--font-display)' }}>Pizzoni</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm md:hidden"
          aria-label="Apri menu"
        >
          <FiMenu className="h-4 w-4 shrink-0" />
          Menu
        </button>

        <div className="hidden flex-wrap items-center gap-2 text-sm md:flex">
          {items.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`top-nav-link inline-flex items-center gap-1.5 leading-none ${active ? 'bg-[rgba(178,74,47,0.16)] text-[var(--ink)]' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="leading-none">{item.label}</span>
              </Link>
            )
          })}
          <button onClick={logout} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm leading-none">
            <FiLogOut className="h-4 w-4 shrink-0" />
            <span className="leading-none">Esci</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[90] flex min-h-screen flex-col bg-[rgba(247,240,228,0.98)] px-5 pb-8 pt-6 md:hidden">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" onClick={() => setMobileOpen(false)} className="font-semibold tracking-tight text-[var(--ink)]">
              <span className="text-xl">🍕</span>
              <span className="ml-2 text-2xl" style={{ fontFamily: 'var(--font-display)' }}>Pizzoni</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
              aria-label="Chiudi menu"
            >
              <FiX className="h-4 w-4 shrink-0" />
              Chiudi
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-2">
            {items.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-base ${
                    active ? 'bg-[rgba(178,74,47,0.16)] text-[var(--ink)]' : 'bg-[rgba(255,255,255,0.7)] text-[var(--ink-soft)]'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <button onClick={logout} className="btn-primary mt-6 inline-flex items-center justify-center gap-2 px-4 py-3 text-base">
            <FiLogOut className="h-5 w-5 shrink-0" />
            Esci
          </button>
        </div>
      )}
    </nav>
  )
}
