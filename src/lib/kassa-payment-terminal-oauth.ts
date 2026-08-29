import { createHmac, timingSafeEqual } from 'node:crypto'
import { VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'
import type { KassaTerminalProvider } from '@/lib/kassa-payment-terminal'

const STATE_TTL_SEC = 15 * 60

type OauthState = {
  v: 1
  tenant: string
  provider: KassaTerminalProvider
  exp: number
}

export function terminalOauthCallbackUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || VYSION_CANONICAL_ORIGIN).replace(/\/$/, '')
  return `${base}/api/kassa/payment-terminal/oauth/callback`
}

function oauthStateSecret(): string | null {
  const a = process.env.SESSION_HMAC_SECRET?.trim()
  if (a && a.length >= 32) return a
  const b = process.env.TERMINAL_OAUTH_STATE_SECRET?.trim()
  if (b && b.length >= 32) return b
  return null
}

export function terminalOauthAppsReady(): Record<KassaTerminalProvider, boolean> {
  const stripePlatform =
    !!(process.env.STRIPE_CONNECT_CLIENT_ID?.trim() &&
      (process.env.STRIPE_SECRET_KEY?.trim() || process.env.STRIPE_PLATFORM_SECRET_KEY?.trim()))
  return {
    stripe: stripePlatform,
    sumup: !!(process.env.SUMUP_CLIENT_ID?.trim() && process.env.SUMUP_CLIENT_SECRET?.trim()),
    mollie: !!(process.env.MOLLIE_CLIENT_ID?.trim() && process.env.MOLLIE_CLIENT_SECRET?.trim()),
  }
}

export function signTerminalOauthState(
  tenant: string,
  provider: KassaTerminalProvider,
): string | null {
  const secret = oauthStateSecret()
  if (!secret) return null
  const payload: OauthState = {
    v: 1,
    tenant: tenant.trim(),
    provider,
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SEC,
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyTerminalOauthState(raw: string): OauthState | null {
  const secret = oauthStateSecret()
  if (!secret || !raw.includes('.')) return null
  const [body, sig] = raw.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OauthState
    if (parsed.v !== 1 || !parsed.tenant || !parsed.provider) return null
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}

export function buildTerminalAuthorizeUrl(provider: KassaTerminalProvider, state: string): string | null {
  const redirect = terminalOauthCallbackUrl()
  if (provider === 'stripe') {
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID?.trim()
    if (!clientId) return null
    const u = new URL('https://connect.stripe.com/oauth/authorize')
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('client_id', clientId)
    u.searchParams.set('scope', 'read_write')
    u.searchParams.set('redirect_uri', redirect)
    u.searchParams.set('state', state)
    return u.toString()
  }
  if (provider === 'sumup') {
    const clientId = process.env.SUMUP_CLIENT_ID?.trim()
    if (!clientId) return null
    const u = new URL('https://api.sumup.com/authorize')
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('client_id', clientId)
    u.searchParams.set('redirect_uri', redirect)
    u.searchParams.set('scope', 'payments transactions.history user.profile')
    u.searchParams.set('state', state)
    return u.toString()
  }
  const clientId = process.env.MOLLIE_CLIENT_ID?.trim()
  if (!clientId) return null
  const u = new URL('https://my.mollie.com/oauth2/authorize')
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', clientId)
  u.searchParams.set('redirect_uri', redirect)
  u.searchParams.set('scope', 'payments.write terminals.read organizations.read')
  u.searchParams.set('state', state)
  u.searchParams.set('approval_prompt', 'auto')
  return u.toString()
}

export type OauthTokenResult =
  | { ok: true; accessToken: string; refreshToken?: string; merchantCode?: string }
  | { ok: false; error: string }

export async function exchangeTerminalOauthCode(
  provider: KassaTerminalProvider,
  code: string,
): Promise<OauthTokenResult> {
  const redirect = terminalOauthCallbackUrl()
  if (provider === 'stripe') {
    const secret =
      process.env.STRIPE_SECRET_KEY?.trim() || process.env.STRIPE_PLATFORM_SECRET_KEY?.trim()
    if (!secret) return { ok: false, error: 'stripe_platform_missing' }
    const res = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_secret: secret,
        code,
      }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string
      refresh_token?: string
      error?: string
      error_description?: string
    }
    if (!res.ok || !json.access_token) {
      return { ok: false, error: json.error_description || json.error || 'stripe_oauth_failed' }
    }
    return { ok: true, accessToken: json.access_token, refreshToken: json.refresh_token }
  }

  if (provider === 'sumup') {
    const clientId = process.env.SUMUP_CLIENT_ID?.trim()
    const clientSecret = process.env.SUMUP_CLIENT_SECRET?.trim()
    if (!clientId || !clientSecret) return { ok: false, error: 'sumup_app_missing' }
    const res = await fetch('https://api.sumup.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirect,
      }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string
      refresh_token?: string
      merchant_code?: string
      error?: string
      message?: string
    }
    if (!res.ok || !json.access_token) {
      return { ok: false, error: json.message || json.error || 'sumup_oauth_failed' }
    }
    let merchantCode = json.merchant_code?.trim()
    if (!merchantCode) {
      const me = await fetch('https://api.sumup.com/v0.1/me', {
        headers: { Authorization: `Bearer ${json.access_token}` },
      })
      const meJson = (await me.json().catch(() => ({}))) as {
        merchant_code?: string
        merchant_profile?: { merchant_code?: string }
      }
      merchantCode = meJson.merchant_code || meJson.merchant_profile?.merchant_code
    }
    return {
      ok: true,
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      merchantCode,
    }
  }

  const clientId = process.env.MOLLIE_CLIENT_ID?.trim()
  const clientSecret = process.env.MOLLIE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return { ok: false, error: 'mollie_app_missing' }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://api.mollie.com/oauth2/tokens', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
    }),
  })
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
    error?: string
    error_description?: string
  }
  if (!res.ok || !json.access_token) {
    return { ok: false, error: json.error_description || json.error || 'mollie_oauth_failed' }
  }
  return { ok: true, accessToken: json.access_token, refreshToken: json.refresh_token }
}
