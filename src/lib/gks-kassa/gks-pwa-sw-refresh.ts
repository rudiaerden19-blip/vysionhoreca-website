/**
 * GKS-pilot: éénmalig oude PWA service worker + Cache Storage opruimen na deploy.
 * Gebruikers hoeven geen DevTools — bij eerste load na update: korte reload, daarna stabiel.
 * Token gelijk houden met CACHE-versie in public/sw.js (v18 bij SW-bump).
 */
export const GKS_PWA_SW_CLEAR_TOKEN = 'v26'

const SESSION_KEY = `vysion_gks_sw_cleared_${GKS_PWA_SW_CLEAR_TOKEN}`

export async function ensureGksPilotFreshServiceWorker(): Promise<'reload' | 'ok'> {
  if (typeof window === 'undefined') return 'ok'

  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return 'ok'
  } catch {
    return 'ok'
  }

  if (!('serviceWorker' in navigator)) {
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    return 'ok'
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* ignore */
  }

  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {
    /* ignore */
  }

  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* ignore */
  }

  /** Geen geforceerde reload — veroorzaakte „kassa start opnieuw” na uitloggen/deploy. */
  return 'ok'
}
