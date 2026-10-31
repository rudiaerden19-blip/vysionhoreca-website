import type { BillitLagoonEnvConfig } from '@/lib/billit-lagoon-pilot'

export type BillitOrderPayload = Record<string, unknown>

type TokenCache = { accessToken: string; expiresAtMs: number }
let tokenCache: TokenCache | null = null

function parseTokenResponse(json: Record<string, unknown>): string | null {
  const t =
    json.access_token ??
    json.accessToken ??
    json.token
  return typeof t === 'string' && t.length > 0 ? t : null
}

export async function billitFetchAccessToken(
  config: BillitLagoonEnvConfig & { clientId: string; clientSecret: string; grantType: string },
): Promise<string> {
  if (tokenCache && tokenCache.expiresAtMs > Date.now() + 60_000) {
    return tokenCache.accessToken
  }

  const url = `${config.apiBaseUrl.replace(/\/$/, '')}/OAuth2/token`
  const body = new URLSearchParams({
    grant_type: config.grantType,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  })

  let json: Record<string, unknown> = {}
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg =
      typeof json.error_description === 'string'
        ? json.error_description
        : typeof json.error === 'string'
          ? json.error
          : `HTTP ${res.status}`
    throw new Error(`Billit token: ${msg}`)
  }

  const accessToken = parseTokenResponse(json)
  if (!accessToken) throw new Error('Billit token: leeg access_token')

  const expiresIn = Number(json.expires_in ?? 3600)
  tokenCache = {
    accessToken,
    expiresAtMs: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
  }
  return accessToken
}

function billitAuthHeaders(config: BillitLagoonEnvConfig): Record<string, string> {
  if (config.apiKey?.trim()) {
    return { ApiKey: config.apiKey.trim() }
  }
  return {}
}

export async function billitCreateOrder(
  config: BillitLagoonEnvConfig,
  order: BillitOrderPayload,
): Promise<{ orderId: string | null; raw: unknown }> {
  const url = `${config.apiBaseUrl.replace(/\/$/, '')}/v1/orders`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...billitAuthHeaders(config),
  }

  if (!config.apiKey?.trim()) {
    if (!config.clientId?.trim() || !config.clientSecret?.trim()) {
      throw new Error('Billit: geen API key of OAuth credentials')
    }
    const token = await billitFetchAccessToken({
      apiBaseUrl: config.apiBaseUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      grantType: config.grantType || 'client_credentials',
    })
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(order),
  })

  let raw: unknown = null
  try {
    raw = await res.json()
  } catch {
    raw = null
  }

  if (!res.ok) {
    const errMsg =
      raw && typeof raw === 'object' && raw !== null && 'Message' in raw
        ? String((raw as { Message?: unknown }).Message)
        : `HTTP ${res.status}`
    throw new Error(`Billit order: ${errMsg}`)
  }

  let orderId: string | null = null
  if (typeof raw === 'number' && Number.isFinite(raw)) orderId = String(raw)
  else if (typeof raw === 'string' && raw.trim()) orderId = raw.trim()
  else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (o.OrderID != null) orderId = String(o.OrderID)
    else if (o.orderID != null) orderId = String(o.orderID)
  }
  return { orderId, raw }
}

/** true = factuur staat nog in Billit, false = verwijderd, null = Billit niet bereikbaar. */
export async function billitOrderExists(
  config: BillitLagoonEnvConfig,
  orderId: string,
): Promise<boolean | null> {
  const id = orderId.trim()
  if (!id) return false
  const url = `${config.apiBaseUrl.replace(/\/$/, '')}/v1/orders/${encodeURIComponent(id)}`
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...billitAuthHeaders(config),
  }
  if (!config.apiKey?.trim()) {
    if (!config.clientId?.trim() || !config.clientSecret?.trim()) return null
    const token = await billitFetchAccessToken({
      apiBaseUrl: config.apiBaseUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      grantType: config.grantType || 'client_credentials',
    })
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(url, { headers })
  if (res.status === 404) return false
  if (!res.ok) return null
  return true
}

/** Tests / server reset */
export function resetBillitTokenCacheForTests(): void {
  tokenCache = null
}
