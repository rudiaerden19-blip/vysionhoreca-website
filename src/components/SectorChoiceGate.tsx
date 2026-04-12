'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/i18n'

const STORAGE_KEY = 'vysion_landing_sector_v1'

const SECTOR_IDS = [
  'frituur',
  'broodjeszaak',
  'kebabzaak',
  'cafe',
  'kapper',
  'beauty_salon',
  'nagelstudio',
  'retail',
  'drankenhandel',
  'foodtruck',
  'ijssalon',
  'marktkramen',
  'other',
] as const

export type LandingSectorId = (typeof SECTOR_IDS)[number]

function isMarketingSitePath(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname.startsWith('/shop')) return false
  if (pathname.startsWith('/superadmin')) return false
  if (pathname.startsWith('/dashboard')) return false
  if (pathname.startsWith('/keuken')) return false
  return true
}

function hasStoredSector(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY))
  } catch {
    return false
  }
}

function saveSector(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sector: id, savedAt: Date.now() }))
  } catch {
    /* ignore */
  }
}

/**
 * Eén keer per browser: sector kiezen op de marketingwebsite (niet op shop/dashboard/superadmin).
 * Responsive (iPhone, iPad, desktop); één tik = kiezen en venster sluiten.
 */
export default function SectorChoiceGate() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isMarketingSitePath(pathname)) {
      setOpen(false)
      return
    }
    if (hasStoredSector()) {
      setOpen(false)
      return
    }
    setOpen(true)
  }, [mounted, pathname])

  const pick = useCallback((id: string) => {
    saveSector(id)
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!mounted || !open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex min-h-0 items-stretch justify-center bg-black/55 px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sector-modal-title"
    >
      <div className="flex max-h-[min(100dvh,100svh)] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 sm:max-h-[90vh]">
        <div className="shrink-0 border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
          <h2
            id="sector-modal-title"
            className="text-center text-lg font-bold leading-snug text-gray-900 sm:text-xl"
          >
            {t('sectorModal.title')}
          </h2>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4"
          role="radiogroup"
          aria-labelledby="sector-modal-title"
        >
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
            {SECTOR_IDS.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => pick(id)}
                  className="flex w-full min-h-[48px] touch-manipulation items-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:border-accent/40 hover:bg-accent/[0.06] active:bg-accent/10 sm:min-h-[52px] sm:text-[15px]"
                >
                  <span
                    className="flex h-5 w-5 shrink-0 rounded-full border-2 border-gray-300 bg-white ring-offset-1"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 leading-snug">{t(`sectorModal.sectors.${id}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  )
}
