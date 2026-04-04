'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'vysion_pwa_install_hint_v1'
const DISMISS_MS = 1000 * 60 * 60 * 24 * 14 // 14 dagen

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
  const q = window.matchMedia('(display-mode: standalone)').matches
  const ios = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true
  const ref = typeof document !== 'undefined' && document.referrer.startsWith('android-app://')
  return q || ios || ref
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
 * Op Android in Chrome toont de adresbalk tot de gebruiker "Toevoegen aan startscherm" doet.
 * Deze banner legt dat uit op tenant-*.ordervysion.com wanneer de PWA nog niet standalone is.
 */
export function InstallPWABanner() {
  const [visible, setVisible] = useState(false)

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
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + DISMISS_MS))
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-amber-200 bg-amber-50 px-3 py-2.5 shadow-lg sm:px-4"
      role="status"
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2 text-sm text-amber-950">
        <p className="font-medium">Volledig scherm zonder adresbalk (Android)</p>
        <p className="text-amber-900/90">
          Tik op het <strong>menu (⋮)</strong> in Chrome → <strong>Install app</strong> of{' '}
          <strong>Toevoegen aan startscherm</strong>. Open daarna het icoon op je startscherm — dan werkt het
          als app zonder adresbalk.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="self-end rounded-md bg-amber-200/80 px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-300"
        >
          Begrepen, verbergen
        </button>
      </div>
    </div>
  )
}
