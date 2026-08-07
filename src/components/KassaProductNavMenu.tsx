'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  VYSION_CANONICAL_ORIGIN,
  VYSION_ORDER_ORIGIN,
  VYSION_TABLEVYSION_ORIGIN,
} from '@/lib/vysion-site'

type KassaProductNavMenuProps = {
  linkClass: string
  /** Desktop: naast andere nav-links. Mobile: in uitklapmenu. */
  layout: 'desktop' | 'mobile'
  onNavigate?: () => void
}

export default function KassaProductNavMenu({ linkClass, layout, onNavigate }: KassaProductNavMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  const subLinks = [
    { href: VYSION_TABLEVYSION_ORIGIN, label: t('nav.restaurantReservations') },
    { href: VYSION_ORDER_ORIGIN, label: t('nav.onlineOrderPlatform') },
  ] as const

  useEffect(() => {
    if (layout !== 'desktop' || !open) return
    function handlePointerOutside(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerOutside, true)
    return () => document.removeEventListener('pointerdown', handlePointerOutside, true)
  }, [layout, open])

  const closeAndNavigate = () => {
    setOpen(false)
    onNavigate?.()
  }

  const chevronClass = `w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`

  if (layout === 'mobile') {
    return (
      <div className="w-full">
        <div className="flex w-full items-stretch">
          <a href={VYSION_CANONICAL_ORIGIN} className={`${linkClass} flex-1`} onClick={closeAndNavigate}>
            {t('nav.kassa')}
          </a>
          <button
            type="button"
            className={`${linkClass} !w-auto shrink-0 px-2`}
            aria-expanded={open}
            aria-label={t('ui.ariaKassaProductMenu')}
            onClick={() => setOpen((v) => !v)}
          >
            <svg className={chevronClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        {open && (
          <div className="ml-3 mt-0.5 flex flex-col border-l border-gray-600 pl-3">
            {subLinks.map((l) => (
              <a key={l.href} href={l.href} className={linkClass} onClick={closeAndNavigate}>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={rootRef}>
      <div className="inline-flex items-center -mx-1">
        <a href={VYSION_CANONICAL_ORIGIN} className={linkClass}>
          {t('nav.kassa')}
        </a>
        <button
          type="button"
          className={`${linkClass} !px-1.5`}
          aria-expanded={open}
          aria-label={t('ui.ariaKassaProductMenu')}
          onClick={() => setOpen((v) => !v)}
        >
          <svg className={chevronClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[15rem] rounded-xl border border-gray-700 bg-dark py-2 shadow-home-image">
          {subLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="flex min-h-11 items-center px-4 py-2.5 text-sm text-gray-200 transition-colors active:bg-white/10 [@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-white"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
