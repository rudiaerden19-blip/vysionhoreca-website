import { getAuthHeaders } from '@/lib/auth-headers'

export function defaultNewPlaylistName(): string {
  const when = new Intl.DateTimeFormat('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
  return `Afspeellijst ${when}`
}

/** Geen browser-login: server SOUNDTRACK_API_BASIC → createManualPlaylist. */
export async function soundtrackCreateManualPlaylist(
  tenant: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('name required')

  const res = await fetch(`/api/soundtrack/${encodeURIComponent(tenant)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      mutation: 'createManualPlaylist',
      input: { name: trimmed },
    }),
  })

  const json = (await res.json()) as {
    ok?: boolean
    error?: string
    playlist?: { id?: string; name?: string }
    playlists?: { id: string; name: string }[]
  }

  if (!res.ok || json.ok === false) {
    throw new Error(json.error || 'createManualPlaylist failed')
  }

  const id = json.playlist?.id?.trim()
  if (!id) throw new Error('createManualPlaylist returned no playlist id')

  const playlistName = json.playlist?.name?.trim() || trimmed
  return { id, name: playlistName }
}
