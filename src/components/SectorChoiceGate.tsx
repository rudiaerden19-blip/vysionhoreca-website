'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/i18n'
import {
  LANDING_BRANCH_COLUMNS,
  LANDING_BRANCH_STORAGE_KEY,
  branchForService,
  type LandingServiceId,
} from '@/lib/landing-branch-choice'
import { shouldShowSectorChoiceGate } from '@/lib/sector-choice-gate-path'

function hasStoredBranch(): boolean {
  try {
    return Boolean(localStorage.getItem(LANDING_BRANCH_STORAGE_KEY))
  } catch {
    return false
  }
}

function saveService(service: LandingServiceId) {
  try {
    localStorage.setItem(
      LANDING_BRANCH_STORAGE_KEY,
      JSON.stringify({
        branch: branchForService(service),
        service,
        savedAt: Date.now(),
      }),
    )
  } catch {
    /* ignore */
  }
}

/**
 * Eerste bezoek marketingwebsite: sub-dienst kiezen (niet op login/registratie/shop/admin).
 * Drie kolommen naast elkaar; onderaan algemeen bekijken.
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
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    if (!shouldShowSectorChoiceGate(pathname, host)) {
      setOpen(false)
      return
    }
    if (hasStoredBranch()) {
      setOpen(false)
      return
    }
    setOpen(true)
  }, [mounted, pathname])

  const pick = useCallback((service: LandingServiceId) => {
    saveService(service)
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
      className="fixed inset-0 z-[200] flex min-h-0 items-stretch justify-center bg-black/55 px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sector-modal-title"
    >
      <div className="flex max-h-[min(100dvh,100svh)] w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 sm:max-h-[90vh]">
        <div className="shrink-0 border-b border-gray-100 px-4 py-4 sm:px-8 sm:py-6">
          <h2
            id="sector-modal-title"
            className="text-center text-lg font-bold leading-snug text-[#5EC4E8] sm:text-2xl"
          >
            {t('sectorModal.title')}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {LANDING_BRANCH_COLUMNS.map((column) => (
              <div
                key={column.id}
                className="flex min-h-0 flex-col rounded-xl border-2 border-gray-200 bg-white px-1 py-3 sm:rounded-2xl sm:px-3 sm:py-5"
              >
                <p className="px-1 text-center text-[11px] font-extrabold tracking-wide text-[#5EC4E8] sm:text-base">
                  {t(`sectorModal.columns.${column.id}.title`)}
                </p>
                <div
                  className="mt-2 flex flex-1 flex-col gap-0.5 sm:mt-4 sm:gap-1"
                  role="list"
                  aria-label={t(`sectorModal.columns.${column.id}.title`)}
                >
                  {column.itemKeys.map((itemKey) => (
                    <button
                      key={itemKey}
                      type="button"
                      onClick={() => pick(itemKey)}
                      className="touch-manipulation rounded-lg px-1 py-1.5 text-center text-[10px] leading-snug text-gray-700 transition-colors hover:bg-accent/[0.08] hover:text-gray-900 active:bg-accent/15 sm:px-2 sm:py-2 sm:text-sm"
                    >
                      {t(`sectorModal.columns.${column.id}.items.${itemKey}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center sm:mt-6">
            <button
              type="button"
              onClick={() => pick('other')}
              className="text-xs text-gray-500 underline-offset-2 transition-colors hover:text-gray-800 hover:underline sm:text-[13px]"
            >
              {t('sectorModal.other')}
            </button>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
