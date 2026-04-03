'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'

type BeforeInstallPromptEventExt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function InstallAppHint() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [standalone, setStandalone] = useState(true)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventExt | null>(null)
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      if (sessionStorage.getItem('vysion_pwa_hint_hide') === '1') {
        setHidden(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!mounted || hidden) return
    if (isStandaloneDisplay()) {
      setStandalone(true)
      return
    }
    setStandalone(false)
    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEventExt)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [mounted, hidden])

  const dismiss = useCallback(() => {
    setHidden(true)
    setOpen(false)
    try {
      sessionStorage.setItem('vysion_pwa_hint_hide', '1')
    } catch {
      /* ignore */
    }
  }, [])

  const runInstall = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setOpen(false)
  }, [deferred])

  if (!mounted || hidden || standalone) return null

  return (
    <div className="fixed bottom-4 end-4 z-[200] flex max-w-sm flex-col items-end gap-2 text-start shadow-lg sm:bottom-6 sm:end-6">
      {open ? (
        <div
          role="dialog"
          aria-label={t('pwa.installTitle')}
          className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-800 shadow-xl dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
        >
          <p className="mb-2 font-semibold text-stone-900 dark:text-white">{t('pwa.installTitle')}</p>
          <p className="mb-3 text-stone-600 dark:text-stone-300">{t('pwa.openInBrowserNote')}</p>
          <ul className="mb-4 list-inside list-disc space-y-2 text-stone-700 dark:text-stone-200">
            <li>{t('pwa.chromeEdge')}</li>
            <li>{t('pwa.safariIos')}</li>
            <li>{t('pwa.safariMac')}</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            {deferred ? (
              <button
                type="button"
                onClick={runInstall}
                className="rounded-xl bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 touch-manipulation"
              >
                {t('pwa.installCta')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-500 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 touch-manipulation"
            >
              {t('pwa.dismiss')}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        {deferred ? (
          <button
            type="button"
            onClick={runInstall}
            className="rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 touch-manipulation"
          >
            {t('pwa.installCta')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-md hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800 touch-manipulation"
          aria-expanded={open}
        >
          {t('pwa.installShort')}
        </button>
      </div>
    </div>
  )
}
