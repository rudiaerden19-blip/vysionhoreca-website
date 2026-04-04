'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'vysion_pwa_install_hint_v1'
const DISMISS_MS = 1000 * 60 * 60 * 24 * 14 // 14 dagen

/** Chrome install prompt (geen standaard lib-type in alle TS-versies) */
type BeforeInstallPromptEventPoly = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isTenantOrdervysionHost(hostname: string): boolean {
  const h = hostname.toLowerCase().split(':')[0]
  if (!h.endsWith('.ordervysion.com')) return false
  if (h === 'ordervysion.com' || h === 'www.ordervysion.com') return false
  return true
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches
  const minimal = window.matchMedia('(display-mode: minimal-ui)').matches
  const ios = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true
  const ref = typeof document !== 'undefined' && document.referrer.startsWith('android-app://')
  return standalone || fullscreen || minimal || ios || ref
}

function dismissExpiry(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const t = parseInt(raw, 10)
    return Number.isFinite(t) ? t : null
  } catch {
    return null
  }
}

/**
 * Adresbalk blijft in een normale Chrome-tab. Na installatie (via prompt of ⋮ menu)
 * opent de site fullscreen/standalone zonder URL-balk.
 */
export function InstallPWABanner() {
  const [visible, setVisible] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEventPoly | null>(null)

  useEffect(() => {
    if (!isAndroid() || isStandalone()) return
    if (typeof window === 'undefined') return
    const path = window.location.pathname
    if (path.startsWith('/admin') || path.includes('/admin/')) return
    const host = window.location.hostname
    if (!isTenantOrdervysionHost(host)) return

    const until = dismissExpiry()
    if (until !== null && Date.now() < until) return

    setVisible(true)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEventPoly)
    }

    const onInstalled = () => {
      setInstallEvent(null)
      setVisible(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const runInstall = useCallback(async () => {
    if (!installEvent) return
    try {
      await installEvent.prompt()
      await installEvent.userChoice
    } catch {
      /* gebruiker annuleert of prompt faalt */
    }
    setInstallEvent(null)
  }, [installEvent])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + DISMISS_MS))
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-amber-200 bg-amber-50 px-3 py-2.5 shadow-lg sm:px-4"
      role="status"
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2 text-sm text-amber-950">
        <p className="font-medium">Geen adresbalk (Android)</p>
        <p className="text-amber-900/90">
          <strong>Toevoegen aan startscherm</strong> maakt vaak alleen een <strong>snelkoppeling</strong> — die opent
          nog in een gewone Chrome-tab mét balk. Je moet de app <strong>installeren</strong>.
        </p>
        <p className="text-amber-900/90">
          Gebruik liefst <strong>Google Chrome</strong> (niet Samsung Internet). Menu <strong>⋮</strong> → kies{' '}
          <strong>App installeren</strong> of <strong>Install app</strong> (niet alleen &quot;Snelkoppeling&quot;).
          Daarna op het <strong>nieuwe</strong> startscherm-icoon tikken — liefst het oude verwijderen om verwarring te
          voorkomen.
        </p>
        {installEvent ? (
          <button
            type="button"
            onClick={runInstall}
            className="rounded-lg bg-amber-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-amber-700"
          >
            Installeer app (aanbevolen)
          </button>
        ) : (
          <p className="text-xs text-amber-800/90">
            Geen installknop? Tik <strong>⋮</strong> → <strong>Install app</strong> of{' '}
            <strong>Toevoegen aan startscherm</strong>. Soms verschijnt de knop pas na even scrollen of opnieuw openen
            van de pagina.
          </p>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="self-end rounded-md bg-amber-200/80 px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-300"
        >
          Verbergen (14 dagen)
        </button>
      </div>
    </div>
  )
}
