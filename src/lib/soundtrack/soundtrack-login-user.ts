import { soundtrackApiBasicAuthorizationHeader } from '@/lib/soundtrack/soundtrack-api-basic'

const SOUNDTRACK_GRAPHQL_URL = 'https://api.soundtrackyourbrand.com/v2'

type GraphqlEnvelope = {
  data?: { loginUser?: { token?: string | null } | null }
  errors?: { message?: string; extensions?: { code?: string } }[]
}

/**
 * Soundtrack `loginUser` — account van de player in de zaak.
 * Vereist Public API-client (Basic) op de server; daarna e-mail/wachtwoord van de user.
 */
export async function soundtrackLoginUser(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const res = await fetch(SOUNDTRACK_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'VysionMusicBFF/1.0',
      ...soundtrackApiBasicAuthorizationHeader(),
    },
    body: JSON.stringify({
      query: `mutation LoginUser($email: String!, $password: String!) {
        loginUser(input: { email: $email, password: $password }) {
          token
        }
      }`,
      variables: { email, password },
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Soundtrack HTTP ${res.status}`)
  }

  const json = (await res.json()) as GraphqlEnvelope
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).filter(Boolean).join('; ')
    if (/unauthenticated/i.test(msg)) {
      throw new Error(
        'Soundtrack weigert login (Public API-key ontbreekt of ongeldig op Vercel).',
      )
    }
    throw new Error(msg || 'Soundtrack login mislukt')
  }

  const token = json.data?.loginUser?.token?.trim()
  if (!token) {
    throw new Error('Onjuiste Soundtrack inlog of account heeft geen API-toegang.')
  }

  return { token }
}
