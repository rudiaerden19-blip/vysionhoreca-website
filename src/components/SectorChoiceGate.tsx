'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/i18n'
import {
  LANDING_BRANCH_COLUMNS,
  LANDING_BRANCH_STORAGE_KEY,
  type LandingBranchId,
} from '@/lib/landing-branch-choice'
import { shouldShowSectorChoiceGate } from '@/lib/sector-choice-gate-path'

function hasStoredBranch(): boolean {
  try {
    return Boolean(localStorage.getItem(LANDING_BRANCH_STORAGE_KEY))
  } catch {
    return false
  }
}

function saveBranch(id: LandingBranchId) {
  try {
    localStorage.setItem(
      LANDING_BRANCH_STORAGE_KEY,
      JSON.stringify({ branch: id, savedAt: Date.now() }),
    )
  } catch {
    /* ignore */
  }
}

/**
 * Eerste bezoek marketingwebsite: branche kiezen (niet op login/registratie/shop/admin).
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

  const pick = useCallback((id: LandingBranchId) => {
    saveBranch(id)
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
            className="text-center text-lg font-bold leading-snug text-gray-900 sm:text-2xl"
          >
            {t('sectorModal.title')}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
          <div
            className="grid grid-cols-3 gap-2 sm:gap-4"
            role="radiogroup"
            aria-labelledby="sector-modal-title"
          >
            {LANDING_BRANCH_COLUMNS.map((column) => (
              <button
                key={column.id}
                type="button"
                onClick={() => pick(column.id)}
                className="flex min-h-0 touch-manipulation flex-col rounded-xl border-2 border-gray-200 bg-white px-1.5 py-3 text-left transition-colors hover:border-accent/50 hover:bg-accent/[0.04] active:bg-accent/10 sm:rounded-2xl sm:px-4 sm:py-5"
              >
                <span className="text-center text-[11px] font-extrabold tracking-wide text-gray-900 sm:text-base">
                  {t(`sectorModal.columns.${column.id}.title`)}
                </span>
                <span className="mt-2 flex flex-1 flex-col gap-1 sm:mt-4 sm:gap-2">
                  {column.itemKeys.map((itemKey) => (
                    <span
                      key={itemKey}
                      className="block text-center text-[10px] leading-snug text-gray-600 sm:text-sm"
                    >
                      {t(`sectorModal.columns.${column.id}.items.${itemKey}`)}
                    </span>
                  ))}
                </span>
              </button>
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
