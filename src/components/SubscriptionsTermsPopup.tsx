'use client'

import { useEffect, useId, useState } from 'react'
import { useLanguage } from '@/i18n'

const DEFAULT_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-full border-2 border-gray-900 bg-white px-8 py-3.5 text-center text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 sm:text-base'

type SubscriptionsTermsPopupProps = {
  /** Wrapper rond de knop (bv. margins, flex center) */
  className?: string
  /** Optionele knop-styling; default = witte pill met zwarte rand */
  buttonClassName?: string
  /** Optionele t()-key voor knoptekst (default: subscriptionsPage.readGeneralTermsCta) */
  labelKey?: string
}

export default function SubscriptionsTermsPopup({
  className = '',
  buttonClassName = DEFAULT_BUTTON_CLASS,
  labelKey,
}: SubscriptionsTermsPopupProps) {
  const { t } = useLanguage()
  const label = labelKey ? t(labelKey) : t('subscriptionsPage.readGeneralTermsCta')
  const [open, setOpen] = useState(false)
  const titleId = `subscriptions-terms-${useId().replace(/:/g, '')}`

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <div className={className}>
        <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
          {label}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-[min(90vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <h2 id={titleId} className="text-lg font-bold text-gray-900 sm:text-xl">
                  {t('subscriptionsTermsPopup.title')}
                </h2>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">{t('subscriptionsTermsPopup.lastUpdated')}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                aria-label={t('ui.ariaClose')}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 text-left">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {t('subscriptionsTermsPopup.body')}
              </div>
              <p className="mt-8 border-t border-gray-200 pt-5 text-xs leading-relaxed text-gray-600">
                {t('subscriptionsTermsPopup.footerBeforeLink')}{' '}
                <a href="/juridisch/dienstenovereenkomst" className="font-medium text-accent hover:underline">
                  {t('legalMain.links.serviceAgreement')}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
