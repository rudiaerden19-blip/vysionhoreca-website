/** Billit dag-sync — pilot alleen The Lagoon (geen andere tenants). */

export const BILLIT_LAGOON_TENANT_SLUG = 'thelagoon'

/** Billit PartyID The Lagoon (eigen bedrijf). */
export const BILLIT_LAGOON_SUPPLIER_PARTY_ID = 31922519

/** Billit klant «Dagontvangstenboek» voor geaggregeerde kassa-dag. */
export const BILLIT_LAGOON_DAILY_CUSTOMER_PARTY_ID = 34609418

export function normalizeBillitTenantSlug(tenantSlug: string): string {
  return String(tenantSlug ?? '').trim().toLowerCase()
}

export function isBillitLagoonPilotTenant(tenantSlug: string): boolean {
  return normalizeBillitTenantSlug(tenantSlug) === BILLIT_LAGOON_TENANT_SLUG
}

export type BillitLagoonEnvConfig = {
  apiBaseUrl: string
  /** Billit My Billit API key (header `ApiKey`) — The Lagoon pilot. */
  apiKey?: string
  clientId?: string
  clientSecret?: string
  grantType?: string
}

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function billitLagoonApiBaseUrl(): string {
  const sandbox = process.env.BILLIT_THELAGOON_SANDBOX === '1' || process.env.BILLIT_THELAGOON_SANDBOX === 'true'
  return (
    process.env.BILLIT_THELAGOON_API_BASE?.trim() ||
    (sandbox ? 'https://api.sandbox.billit.be' : 'https://api.billit.be')
  )
}

/** Server-only: credentials via Vercel env, nooit in git. */
export function getBillitLagoonEnvConfig(): BillitLagoonEnvConfig | null {
  const apiBaseUrl = billitLagoonApiBaseUrl()

  const apiKeyExplicit = process.env.BILLIT_THELAGOON_API_KEY?.trim() || ''
  const clientId =
    process.env.BILLIT_THELAGOON_CLIENT_ID?.trim() ||
    process.env.BILLIT_THELAGOON_EMAIL?.trim() ||
    ''
  const clientSecret =
    process.env.BILLIT_THELAGOON_CLIENT_SECRET?.trim() ||
    process.env.BILLIT_THELAGOON_PASSWORD?.trim() ||
    ''

  const apiKey =
    apiKeyExplicit ||
    (UUID_LIKE.test(clientSecret) ? clientSecret : '') ||
    (UUID_LIKE.test(clientId) ? clientId : '')

  if (apiKey) {
    return { apiBaseUrl, apiKey }
  }

  if (!clientId || !clientSecret) return null

  const grantType = process.env.BILLIT_THELAGOON_GRANT_TYPE?.trim() || 'client_credentials'

  return { apiBaseUrl, clientId, clientSecret, grantType }
}

export function billitExternalProviderId(tenantSlug: string, reportDate: string): string {
  return `vysion-${normalizeBillitTenantSlug(tenantSlug)}-${reportDate}`
}
