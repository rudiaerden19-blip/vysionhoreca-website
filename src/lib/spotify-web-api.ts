export class SpotifyConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SpotifyConfigError'
  }
}

export class SpotifyApiError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = 'SpotifyApiError'
    this.status = status
  }
}

type SpotifyTokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

function spotifyClientCredentials(): { id: string; secret: string } {
  const id = (process.env.SPOTIFY_CLIENT_ID || '').trim()
  const secret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim()
  if (!id || !secret) {
    throw new SpotifyConfigError('Spotify API not configured (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET)')
  }
  return { id, secret }
}

export async function getSpotifyAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token
  }
  const { id, secret } = spotifyClientCredentials()
  const basic = Buffer.from(`${id}:${secret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  const json = (await res.json()) as SpotifyTokenResponse
  if (!res.ok || !json.access_token) {
    throw new SpotifyApiError(json.error || `Spotify token HTTP ${res.status}`, res.status)
  }
  const ttl = typeof json.expires_in === 'number' ? json.expires_in : 3600
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + ttl * 1000,
  }
  return json.access_token
}

export type SpotifyPlaylistTrackRow = {
  spotifyTrackId: string
  name: string
  artists: string[]
}

type SpotifyPlaylistTracksPage = {
  items: {
    track: {
      id?: string
      name?: string
      artists?: { name?: string }[]
    } | null
  }[]
  next: string | null
}

/** Publieke playlist; maxTracks cap voorkomt timeouts bij grote lijsten. */
export async function fetchSpotifyPlaylistTracks(
  playlistId: string,
  maxTracks = 200,
): Promise<{ playlistName: string; tracks: SpotifyPlaylistTrackRow[] }> {
  const token = await getSpotifyAccessToken()
  const headers = { Authorization: `Bearer ${token}` }

  const metaRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name`, {
    headers,
    cache: 'no-store',
  })
  const meta = (await metaRes.json()) as { name?: string; error?: { message?: string } }
  if (!metaRes.ok) {
    throw new SpotifyApiError(
      meta.error?.message || `Spotify playlist HTTP ${metaRes.status}`,
      metaRes.status,
    )
  }

  const tracks: SpotifyPlaylistTrackRow[] = []
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,name,artists(name))),next`

  while (url && tracks.length < maxTracks) {
    const res = await fetch(url, { headers, cache: 'no-store' })
    const page = (await res.json()) as SpotifyPlaylistTracksPage & {
      error?: { message?: string }
    }
    if (!res.ok) {
      throw new SpotifyApiError(
        page.error?.message || `Spotify tracks HTTP ${res.status}`,
        res.status,
      )
    }
    for (const item of page.items ?? []) {
      const tr = item.track
      if (!tr) continue
      const id = tr.id?.trim()
      const name = tr.name?.trim()
      if (!id || !name) continue
      const artists =
        tr.artists?.map((a) => a.name?.trim()).filter((n): n is string => Boolean(n)) ?? []
      tracks.push({ spotifyTrackId: id, name, artists })
      if (tracks.length >= maxTracks) break
    }
    url = tracks.length >= maxTracks ? null : page.next
  }

  return {
    playlistName: (meta.name || '').trim() || 'Spotify playlist',
    tracks,
  }
}
