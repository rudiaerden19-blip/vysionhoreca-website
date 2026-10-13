import { createHash, randomBytes } from 'crypto'

const TOKEN_PREFIX = 'vpa_'

export function generatePrintAgentDeviceToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
}

export function hashPrintAgentDeviceToken(token: string): string {
  return createHash('sha256').update(token.trim(), 'utf8').digest('hex')
}

export function isValidPrintAgentDeviceTokenFormat(token: string): boolean {
  const t = token.trim()
  return t.startsWith(TOKEN_PREFIX) && t.length >= TOKEN_PREFIX.length + 16
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
  if (!m) return null
  const t = m[1].trim()
  return t || null
}
