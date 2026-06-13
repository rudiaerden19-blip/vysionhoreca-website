/**
 * HMAC-getekend sessietoken voor zaak-eigenaar en superadmin.
 *
 * Doel: replace de naakte `x-business-id`+ `x-auth-email`headers (uit
 * localStorage) door een token dat alleen door de server kan worden gemaakt.
 * Iemand die je business_id + email kent, kan zonder dit token niet meer
 * gewoon doen alsof hij ingelogd is.
 *
 * Vereiste env-var: `SESSION_HMAC_SECRET`(>= 32 bytes random; in Vercel
 * Project Settings zetten). Zonder secret returnt sign() null en verify()
 * null → de auth-laag valt automatisch terug op de oude header-mode (zie
 * `verify-tenant-access.ts`). Zo breekt niets als de env-var ontbreekt;
 * een kort logbericht wordt geschreven.
 *
 * Geen JWT-bibliotheek: één eigen klein formaat, makkelijk te auditten:
 *
 *   <base64url-payload>.<base64url-hmac-sha256>
 *
 * Payload (JSON):
 *
 *   {
 *     v: 1,
 *     k: 'owner' |  'superadmin',
 *     id: string,                    // business_profiles.id of super_admins.id
 *     email: string,                 // lowercase
 *     tenant_slug?: string,          // alleen bij k=owner; optioneel
 *     iat: number,                   // unix-seconds
 *     exp: number                    // unix-seconds
 *   }
 *
 * NB: alleen importeren in server-side code (route handlers / lib/*-server*).
 * Crypto-secret mag nooit naar de client.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 1
const DEFAULT_TTL_SECONDS = 14 * 24 * 60 * 60 // 14 dagen — gelijk aan oude OWNER_SESSION_TTL_MS

export type SessionKind = 'owner' |  'superadmin'

export interface OwnerSessionPayload {
  v: number
  k: 'owner'
  id: string
  email: string
  tenant_slug: string
  iat: number
  exp: number
}

export interface SuperadminSessionPayload {
  v: number
  k: 'superadmin'
  id: string
  email: string
  iat: number
  exp: number
}

export type SessionPayload = OwnerSessionPayload | SuperadminSessionPayload

function getSecret(): string | null {
  const s = process.env.SESSION_HMAC_SECRET?.trim()
  if (!s) return null
  if (s.length < 32) {
    // Te kort = onveilig; behandelen alsof niet ingesteld zodat fallback grijpt.
    return null
  }
  return s
}

/**
 * Health-check helper. Gebruikt door `/api/health`om te tonen of HMAC-auth
 * actief is. Lekt niets over de inhoud van het secret.
 */
export function getSessionHmacStatus(): 'configured' |  'weak' |  'not_configured'{
  const raw = process.env.SESSION_HMAC_SECRET?.trim()
  if (!raw) return 'not_configured'
  if (raw.length < 32) return 'weak'
  return 'configured'
}

/**
 * Eenmalige waarschuwing in productie als HMAC-secret ontbreekt of te kort is.
 * Logs naar stderr (Vercel Logs) zodat een ontbrekend secret niet meer
 * stilzwijgend wordt opgevangen door de header-mode-fallback.
 *
 * Wordt aangeroepen vanuit de health-route — in elke serverless cold-start
 * zien we de waarschuwing dan minstens één keer.
 */
let _hmacWarningLogged = false
export function logSessionHmacWarningOnce(): void {
  if (_hmacWarningLogged) return
  if (process.env.NODE_ENV !== 'production') return
  const status = getSessionHmacStatus()
  if (status === 'configured') return
  _hmacWarningLogged = true
  // eslint-disable-next-line no-console
  console.warn(
    `[SECURITY] SESSION_HMAC_SECRET ${status} → auth valt terug op legacy `+
      `header-mode (x-business-id + x-auth-email). Zet een random secret `+
      `van >= 32 bytes in Vercel Project Settings → Environment Variables.`
  )
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function b64urlDecode(s: string): Buffer | null {
  try {
    return Buffer.from(s, 'base64url')
  } catch {
    return null
  }
}

function hmac(secret: string, body: string): string {
  return b64url(createHmac('sha256', secret).update(body, 'utf8').digest())
}

export interface SignSessionInput {
  kind: SessionKind
  id: string
  email: string
  tenantSlug?: string
  ttlSeconds?: number
}

/**
 * Geef een ondertekend token terug. Returned `null`als de secret ontbreekt
 * of te kort is — caller logt dan en valt terug op header-mode.
 */
export function signSessionToken(input: SignSessionInput): string | null {
  const secret = getSecret()
  if (!secret) return null

  const now = Math.floor(Date.now() / 1000)
  const exp = now + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS)
  const baseEmail = (input.email || '').toLowerCase().trim()
  const baseId = String(input.id || '').trim()
  if (!baseId || !baseEmail) return null

  let payload: SessionPayload
  if (input.kind === 'owner') {
    const slug = (input.tenantSlug || '').trim()
    if (!slug) return null
    payload = {
      v: TOKEN_VERSION,
      k: 'owner',
      id: baseId,
      email: baseEmail,
      tenant_slug: slug,
      iat: now,
      exp,
    }
  } else {
    payload = {
      v: TOKEN_VERSION,
      k: 'superadmin',
      id: baseId,
      email: baseEmail,
      iat: now,
      exp,
    }
  }

  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const sig = hmac(secret, body)
  return `${body}.${sig}`
}

/**
 * Verifieer een token. Geeft de payload terug bij succes, `null`bij elk falen
 * (geen secret, ongeldige vorm, slechte signature, expired, verkeerde versie).
 * NOOIT exception throwen — caller mag rustig downgraden naar header-mode.
 */
export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token) return null
  const secret = getSecret()
  if (!secret) return null

  const dot = token.indexOf('.')
  if (dot <= 0 || dot >= token.length - 1) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expectedSig = hmac(secret, body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null

  const decoded = b64urlDecode(body)
  if (!decoded) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(decoded.toString('utf8'))
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as Record<string, unknown>
  if (p.v !== TOKEN_VERSION) return null
  if (typeof p.id !== 'string' || typeof p.email !== 'string') return null
  if (typeof p.iat !== 'number' || typeof p.exp !== 'number') return null
  if (p.exp < Math.floor(Date.now() / 1000)) return null

  if (p.k === 'owner') {
    if (typeof p.tenant_slug !== 'string' || !p.tenant_slug) return null
    return {
      v: TOKEN_VERSION,
      k: 'owner',
      id: p.id,
      email: p.email,
      tenant_slug: p.tenant_slug,
      iat: p.iat,
      exp: p.exp,
    }
  }
  if (p.k === 'superadmin') {
    return {
      v: TOKEN_VERSION,
      k: 'superadmin',
      id: p.id,
      email: p.email,
      iat: p.iat,
      exp: p.exp,
    }
  }
  return null
}

/** Helper voor diagnose-logs (geen secret-leak). */
export function describeSessionTokenForLog(token: string | null | undefined): {
  present: boolean
  format_ok: boolean
  has_secret: boolean
} {
  const present = !!token
  const has_secret = !!getSecret()
  let format_ok = false
  if (present) {
    const dot = (token as string).indexOf('.')
    format_ok = dot > 0 && dot < (token as string).length - 1
  }
  return { present, format_ok, has_secret }
}
