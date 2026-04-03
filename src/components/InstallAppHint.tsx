'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'

type BeforeInstallPromptEventExt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __VYSION_BIP__?: BeforeInstallPromptEventExt
  }
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function readDeferredFromWindow(): BeforeInstallPromptEventExt | null {
  const w = typeof window !== 'undefined' ? window.__VYSION_BIP__ : undefined
  return w ?? null
}

export function InstallAppHint() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventExt | null>(null)
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    setStandalone(isStandaloneDisplay())
  }, [])

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

  const syncDeferred = useCallback(() => {
    const fromWindow = readDeferredFromWindow()
    if (fromWindow) setDeferred(fromWindow)
  }, [])

  useEffect(() => {
    if (!mounted || hidden || standalone) return

    syncDeferred()

    const onBip = (e: Event) => {
      e.preventDefault()
      const ev = e as BeforeInstallPromptEventExt
      window.__VYSION_BIP__ = ev
      setDeferred(ev)
    }
    const onCustom = () => syncDeferred()

    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('vysion-bip', onCustom)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('vysion-bip', onCustom)
    }
  }, [mounted, hidden, standalone, syncDeferred])

  /** Zodra de service worker actief is, stuurt Chromium vaak alsnog beforeinstallprompt. */
  useEffect(() => {
    if (!mounted || hidden || standalone) return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then(() => syncDeferred()).catch(() => {})
  }, [mounted, hidden, standalone, syncDeferred])

  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [open])

  const dismiss = useCallback(() => {
    setHidden(true)
    setOpen(false)
    setInstallError(null)
    try {
      sessionStorage.setItem('vysion_pwa_hint_hide', '1')
    } catch {
      /* ignore */
    }
  }, [])

  const runInstall = useCallback(() => {
    const ev = deferred ?? readDeferredFromWindow()
    if (!ev) {
      setOpen(true)
      setInstallError(null)
      return
    }
    setInstallError(null)
    ev.prompt().catch(() => {
      setInstallError(t('pwa.installFailed'))
      setOpen(true)
    })
    ev.userChoice.finally(() => {
      window.__VYSION_BIP__ = undefined
      setDeferred(null)
    })
  }, [deferred, t])

  /** Eén tik: installeer als de browser het aabiedt, anders meteen uitleg. */
  const onPrimaryClick = useCallback(() => {
    setInstallError(null)
    const ev = deferred ?? readDeferredFromWindow()
    if (ev) {
      runInstall()
      return
    }
    setOpen(true)
  }, [deferred, runInstall])

  if (!mounted || hidden || standalone) return null

  const primaryLabel = deferred || readDeferredFromWindow() ? t('pwa.installCta') : t('pwa.installShort')

  return (
    <div className="fixed bottom-4 end-4 z-[200] flex max-w-sm flex-col items-end gap-2 text-start shadow-lg sm:bottom-6 sm:end-6">
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('pwa.installTitle')}
          className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-800 shadow-xl dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
        >
          <p className="mb-2 font-semibold text-stone-900 dark:text-white">{t('pwa.installTitle')}</p>
          {installError ? (
            <p className="mb-3 rounded-lg bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {installError}
            </p>
          ) : null}
          <p className="mb-3 text-stone-600 dark:text-stone-300">{t('pwa.openInBrowserNote')}</p>
          <ul className="mb-4 list-inside list-disc space-y-2 text-stone-700 dark:text-stone-200">
            <li>{t('pwa.chromeEdge')}</li>
            <li>{t('pwa.safariIos')}</li>
            <li>{t('pwa.safariMac')}</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            {deferred || readDeferredFromWindow() ? (
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

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onPrimaryClick}
          className="rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 touch-manipulation"
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-md hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800 touch-manipulation"
          aria-expanded={open}
        >
          {t('pwa.helpSteps')}
        </button>
      </div>
    </div>
  )
}
