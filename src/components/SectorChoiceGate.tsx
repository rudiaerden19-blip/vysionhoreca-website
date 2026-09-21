'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/i18n'
import {
  LANDING_BRANCH_COLUMNS,
  LANDING_BRANCH_STORAGE_KEY,
  branchForService,
  type LandingServiceId,
} from '@/lib/landing-branch-choice'
import {
  readPageLoadNavigationType,
  shouldOpenSectorChoiceOnThisLoad,
  shouldShowSectorChoiceGate,
} from '@/lib/sector-choice-gate-path'

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
 * Marketingwebsite: branche kiezen alleen bij eerste bezoek of paginaverversen.
 * Interne navigatie (menu, client-side routes) opent de popup niet opnieuw.
 */
export default function SectorChoiceGate() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const decidedOpenForThisJsLoad = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const host = window.location.hostname
    const path = pathname || window.location.pathname
    if (!path) return

    const allowed = shouldShowSectorChoiceGate(path, host)

    if (!decidedOpenForThisJsLoad.current) {
      decidedOpenForThisJsLoad.current = true
      if (!allowed) {
        setOpen(false)
        return
      }
      setOpen(
        shouldOpenSectorChoiceOnThisLoad({
          navigationType: readPageLoadNavigationType(),
          referrer: document.referrer,
          pageOrigin: window.location.origin,
        }),
      )
      return
    }

    if (!allowed || dismissed) {
      setOpen(false)
    }
  }, [mounted, pathname, dismissed])

  const pick = useCallback((service: LandingServiceId) => {
    saveService(service)
    setDismissed(true)
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sector-modal-title"
    >
      <div className="flex max-h-[min(92dvh,100svh)] w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="shrink-0 border-b border-gray-100 px-4 py-3 sm:px-8 sm:py-6">
          <h2
            id="sector-modal-title"
            className="text-center text-base font-bold leading-snug text-[#5EC4E8] sm:text-2xl"
          >
            {t('sectorModal.title')}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {LANDING_BRANCH_COLUMNS.map((column) => (
              <div
                key={column.id}
                className="flex min-h-0 flex-col rounded-xl border-2 border-gray-200 bg-white px-3 py-3 sm:rounded-2xl sm:px-3 sm:py-5"
              >
                <p className="text-center text-sm font-extrabold tracking-wide text-[#5EC4E8] sm:text-base">
                  {t(`sectorModal.columns.${column.id}.title`)}
                </p>
                <div
                  className="mt-2 grid grid-cols-2 gap-1 sm:mt-4 sm:flex sm:flex-col sm:gap-1"
                  role="list"
                  aria-label={t(`sectorModal.columns.${column.id}.title`)}
                >
                  {column.itemKeys.map((itemKey) => (
                    <button
                      key={itemKey}
                      type="button"
                      onClick={() => pick(itemKey)}
                      className="min-h-10 touch-manipulation rounded-lg px-1.5 py-2 text-center text-xs leading-snug text-gray-700 transition-colors hover:bg-accent/[0.08] hover:text-gray-900 active:bg-accent/15 sm:min-h-0 sm:px-2 sm:py-2 sm:text-sm"
                    >
                      {t(`sectorModal.columns.${column.id}.items.${itemKey}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="shrink-0 border-t border-gray-100 px-3 py-2 text-center sm:py-4">
          <button
            type="button"
            onClick={() => pick('other')}
            className="inline-flex min-h-10 items-center px-3 text-sm text-gray-500 underline-offset-2 transition-colors hover:text-gray-800 hover:underline sm:min-h-0 sm:text-[13px]"
          >
            {t('sectorModal.other')}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  )
}
