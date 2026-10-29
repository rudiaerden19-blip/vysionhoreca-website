import { isTheLagoonTenant } from '@/lib/lagoon-kitchen-screen'

/** Pilot The Lagoon: rapporten alleen na verse eigenaar-PIN (geen gedeelde unlock voor personeel). */
export function lagoonStrictReportsPinEnabled(
  tenantSlug: string,
  opts?: { kassaNameAccountV2?: boolean | null },
): boolean {
  if (isTheLagoonTenant(tenantSlug)) return true
  if (opts?.kassaNameAccountV2 === true) return true
  return false
}

/** Wis elke zaak-PIN-unlock (voorkomt thelagoon vs the-lagoon bypass). */
export function clearAllOwnerPinUnlockSessions(): void {
  if (typeof window === 'undefined') return
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(OWNER_PIN_SESSION_PREFIX)) keys.push(k)
    }
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* noop */
  }
}

const OWNER_PIN_SESSION_PREFIX = 'vysion_pin_unlocked_'

/** Rapporten-module paden (zie `tenant-modules` route → module `rapporten`). */
export function isLagoonStrictReportsAdminRestPath(rest: string): boolean {
  const path = rest.startsWith('/') ? rest : `/${rest}`
  return (
    path.startsWith('/rapporten') ||
    path.startsWith('/kasboek') ||
    path.startsWith('/z-rapport') ||
    path.startsWith('/analyse') ||
    path.startsWith('/populair') ||
    path.startsWith('/verkoop') ||
    path.startsWith('/boekhouding')
  )
}

export function clearOwnerPinUnlockSession(tenantSlug: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(`${OWNER_PIN_SESSION_PREFIX}${tenantSlug}`)
  } catch {
    /* noop */
  }
}

/** Lagoon: wis gedeelde PIN-unlock (b.v. na inklokken medewerker). */
export function clearLagoonOwnerPinUnlockIfStrict(tenantSlug: string): void {
  if (!lagoonStrictReportsPinEnabled(tenantSlug)) return
  clearOwnerPinUnlockSession(tenantSlug)
}
