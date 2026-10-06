/** Vercel / .env.local: base64(clientId:clientSecret) of `Basic …` prefix. */
export function soundtrackApiBasicToken(): string {
  let t = (process.env.SOUNDTRACK_API_BASIC || '').trim()
  if (/^basic\s/i.test(t)) t = t.replace(/^basic\s+/i, '').trim()
  if (!t || t === '[SENSITIVE]') {
    throw new Error(
      'Soundtrack Public API niet geconfigureerd op de server (SOUNDTRACK_API_BASIC).',
    )
  }
  return t
}

export function soundtrackApiBasicAuthorizationHeader(): Record<string, string> {
  return { Authorization: `Basic ${soundtrackApiBasicToken()}` }
}
