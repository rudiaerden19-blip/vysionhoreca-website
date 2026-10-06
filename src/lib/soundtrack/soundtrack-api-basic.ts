const SOUNDTRACK_GRAPHQL_URL = 'https://api.soundtrackyourbrand.com/v2'

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

export function isSoundtrackApiBasicConfigured(): boolean {
  try {
    soundtrackApiBasicToken()
    return true
  } catch {
    return false
  }
}

/** Controleer of SOUNDTRACK_API_BASIC op de server werkt (zelfde als play/pause BFF). */
export async function pingSoundtrackPublicApi(): Promise<{ ok: boolean; error?: string }> {
  try {
    soundtrackApiBasicToken()
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'SOUNDTRACK_API_BASIC ontbreekt',
    }
  }

  try {
    const res = await fetch(SOUNDTRACK_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VysionMusicBFF/1.0',
        ...soundtrackApiBasicAuthorizationHeader(),
      },
      body: JSON.stringify({
        query: `query { me { __typename } }`,
      }),
      cache: 'no-store',
    })
    const json = (await res.json()) as {
      data?: { me?: { __typename?: string } | null }
      errors?: { message?: string }[]
    }
    if (!res.ok || json.errors?.length) {
      const msg = json.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`
      return { ok: false, error: msg }
    }
    if (!json.data?.me?.__typename) {
      return { ok: false, error: 'Geen antwoord van Soundtrack (me)' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Kon Soundtrack API niet bereiken' }
  }
}
