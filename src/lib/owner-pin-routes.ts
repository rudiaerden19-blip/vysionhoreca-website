/**
 * Admin-routes die eigenaar-PIN vereisen (PinGate + verplichte eerste setup).
 * Zaakprofiel, openingstijden en overige website-instellingen horen hier niet bij.
 */
const PROTECTED_SEGMENTS = [
  'categorieen',
  'producten',
  'abonnement',
  'betaling',
  'personeel',
  'rapporten',
  'z-rapport',
  'analyse',
  'inklokken',
  'kassa-terminal',
] as const

function normalizePath(pathname: string): string {
  const p = pathname.split('?')[0].replace(/\/+$/, '')
  return p || '/'
}

export function adminPathRequiresOwnerPin(pathname: string, tenantSlug: string): boolean {
  const path = normalizePath(pathname)
  const base = `/shop/${tenantSlug}/admin`
  if (path === base) return true
  if (path.startsWith(`${base}/producten/intake`)) return true
  for (const seg of PROTECTED_SEGMENTS) {
    if (path === `${base}/${seg}` || path.startsWith(`${base}/${seg}/`)) {
      return true
    }
  }
  return false
}
