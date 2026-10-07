/** Gedeeld token kassa ↔ klantscherm (BroadcastChannel). localStorage = zelfde origin, alle tabbladen. */

export function klantschermStorageKey(tenantSlug: string): string {
  return `vysion_klantscherm_${tenantSlug.trim()}`
}

export function readKlantschermSessionToken(tenantSlug: string): string {
  if (typeof window === 'undefined') return ''
  const key = klantschermStorageKey(tenantSlug)
  try {
    const fromLocal = localStorage.getItem(key)?.trim()
    if (fromLocal) return fromLocal
    const fromSession = sessionStorage.getItem(key)?.trim()
    if (fromSession) {
      localStorage.setItem(key, fromSession)
      return fromSession
    }
  } catch {
    /* ignore */
  }
  return ''
}

export function writeKlantschermSessionToken(tenantSlug: string, token: string): void {
  if (typeof window === 'undefined') return
  const key = klantschermStorageKey(tenantSlug)
  try {
    localStorage.setItem(key, token.trim())
    sessionStorage.setItem(key, token.trim())
  } catch {
    /* ignore */
  }
}

export function createKlantschermSessionToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getOrCreateKlantschermSessionToken(tenantSlug: string): string {
  const existing = readKlantschermSessionToken(tenantSlug)
  if (existing) return existing
  const tok = createKlantschermSessionToken()
  writeKlantschermSessionToken(tenantSlug, tok)
  return tok
}

/** Eén auto-open per browser-tab-sessie als kassa start (klantscherm_enabled). */
export function klantschermAutoOpenSessionKey(tenantSlug: string): string {
  return `vysion_klantscherm_auto_open_${tenantSlug.trim()}`
}

export function klantschermPublicUrl(tenantSlug: string, token: string, origin?: string): string {
  const base = (origin ?? (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '')
  return `${base}/shop/${encodeURIComponent(tenantSlug)}/klantscherm?t=${encodeURIComponent(token)}`
}
