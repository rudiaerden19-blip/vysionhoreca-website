import { isTheLagoonTenant } from '@/lib/lagoon-kitchen-screen'

/** Pilot The Lagoon: strikte rapport-PIN — **niet** koppelen aan op-rekening v2 (andere tenants). */
export function lagoonStrictReportsPinEnabled(tenantSlug: string): boolean {
  return isTheLagoonTenant(tenantSlug)
}

/** Header-naam «The Lagoon» (fallback als route-slug afwijkt van DB). */
export function isLagoonBusinessDisplayName(businessName: string | null | undefined): boolean {
  return String(businessName ?? '').trim().toLowerCase() === 'the lagoon'
}

/** Kassa hamburger Menu → eigenaar-PIN (alleen deze zaak). */
export function lagoonKassaMenuPinRequired(
  routeTenantSlug: string,
  opts?: { settingsTenantSlug?: string | null; businessName?: string | null },
): boolean {
  if (isTheLagoonTenant(routeTenantSlug)) return true
  const settingsSlug = String(opts?.settingsTenantSlug ?? '').trim()
  if (settingsSlug && isTheLagoonTenant(settingsSlug)) return true
  return isLagoonBusinessDisplayName(opts?.businessName)
}

export function resolveLagoonPinTenantSlug(
  routeTenantSlug: string,
  settingsTenantSlug?: string | null,
): string {
  const fromSettings = String(settingsTenantSlug ?? '').trim()
  if (fromSettings && isTheLagoonTenant(fromSettings)) return fromSettings
  return routeTenantSlug
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

/** Rapporten-module paden — alle tenants (zie `tenant-modules` → module `rapporten`). */
export function isReportsAdminRestPath(rest: string): boolean {
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
