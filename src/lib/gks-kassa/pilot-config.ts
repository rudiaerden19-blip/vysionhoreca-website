/** Vaste pilot-identiteit tot tenant-instellingen (antwoord 9). */

export const GKS_PILOT_POS_ID = 'CFOD0010000001'
export const GKS_PILOT_TERMINAL_ID = 'TERMINAL-01'
export const GKS_PILOT_DEVICE_ID = 'POS-01'
export const GKS_PILOT_POS_SW_VERSION = 'gks-kassa-stap1'

/** Vestigingseenheid — pilot; later uit tenant DB. */
export const GKS_PILOT_EST_NO = '8789456149'

export function gksPilotTenantSlugs(): string[] {
  const raw =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_GKS_PILOT_TENANTS || process.env.GKS_PILOT_TENANTS || ''
      : ''
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (fromEnv.length > 0) return fromEnv
  return ['demo-frituur']
}

export function isGksZReportPilotTenant(tenantSlug: string): boolean {
  return gksPilotTenantSlugs().includes(tenantSlug)
}

export const GKS_MANDATORY_STAFF_SESSION = true
