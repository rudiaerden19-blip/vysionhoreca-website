/** Billit dag-sync — pilot alleen The Lagoon (geen andere tenants). */

export const BILLIT_LAGOON_TENANT_SLUG = 'thelagoon'

export function normalizeBillitTenantSlug(tenantSlug: string): string {
  return String(tenantSlug ?? '').trim().toLowerCase()
}

export function isBillitLagoonPilotTenant(tenantSlug: string): boolean {
  return normalizeBillitTenantSlug(tenantSlug) === BILLIT_LAGOON_TENANT_SLUG
}

export type BillitLagoonEnvConfig = {
  apiBaseUrl: string
  clientId: string
  clientSecret: string
  grantType: string
}

/** Server-only: credentials via Vercel env, nooit in git. */
export function getBillitLagoonEnvConfig(): BillitLagoonEnvConfig | null {
  const clientId =
    process.env.BILLIT_THELAGOON_CLIENT_ID?.trim() ||
    process.env.BILLIT_THELAGOON_EMAIL?.trim() ||
    ''
  const clientSecret =
    process.env.BILLIT_THELAGOON_CLIENT_SECRET?.trim() ||
    process.env.BILLIT_THELAGOON_PASSWORD?.trim() ||
    ''
  if (!clientId || !clientSecret) return null

  const sandbox = process.env.BILLIT_THELAGOON_SANDBOX === '1' || process.env.BILLIT_THELAGOON_SANDBOX === 'true'
  const apiBaseUrl =
    process.env.BILLIT_THELAGOON_API_BASE?.trim() ||
    (sandbox ? 'https://api.sandbox.billit.be' : 'https://api.billit.be')

  const grantType = process.env.BILLIT_THELAGOON_GRANT_TYPE?.trim() || 'client_credentials'

  return { apiBaseUrl, clientId, clientSecret, grantType }
}

export function billitExternalProviderId(tenantSlug: string, reportDate: string): string {
  return `vysion-${normalizeBillitTenantSlug(tenantSlug)}-${reportDate}`
}
