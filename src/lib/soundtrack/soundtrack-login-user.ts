const SOUNDTRACK_GRAPHQL_URL = 'https://api.soundtrackyourbrand.com/v2'

type GraphqlEnvelope = {
  data?: { loginUser?: { token?: string | null } | null }
  errors?: { message?: string }[]
}

/** Soundtrack `loginUser` — zelfde inlog als de desktop player (geen Authorization-header). */
export async function soundtrackLoginUser(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const res = await fetch(SOUNDTRACK_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(msg || 'Soundtrack login mislukt')
  }

  const token = json.data?.loginUser?.token?.trim()
  if (!token) {
    throw new Error('Soundtrack login: geen token ontvangen')
  }

  return { token }
}
