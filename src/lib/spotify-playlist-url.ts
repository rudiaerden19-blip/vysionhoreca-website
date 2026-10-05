/** Spotify playlist-URL of URI → playlist-id. */
export function parseSpotifyPlaylistId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const uriMatch = raw.match(/^spotify:playlist:([a-zA-Z0-9]+)(?:\?.*)?$/i)
  if (uriMatch?.[1]) return uriMatch[1]

  try {
    const url = raw.startsWith('http') ? new URL(raw) : new URL(`https://${raw}`)
    const host = url.hostname.toLowerCase()
    if (!host.includes('spotify.com')) return null
    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => p.toLowerCase() === 'playlist')
    if (idx >= 0 && parts[idx + 1]) {
      return parts[idx + 1].split('?')[0] || null
    }
  } catch {
    return null
  }
  return null
}
