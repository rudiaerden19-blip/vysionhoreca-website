import { getAuthHeaders } from '@/lib/auth-headers'

export type SoundtrackCreateManualPlaylistResult = {
  playlist: { id: string; name: string }
  playlists: { id: string; name: string }[]
}

/** Soundtrack Public API: mutation createManualPlaylist (Create → Create a playlist). */
export async function soundtrackCreateManualPlaylist(
  tenant: string,
  name: string,
): Promise<SoundtrackCreateManualPlaylistResult> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('name required')
  }

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
  if (!id) {
    throw new Error('createManualPlaylist returned no playlist id')
  }

  const playlistName = json.playlist?.name?.trim() || trimmed
  const inList = (json.playlists ?? []).some(
    (p) => p.id.trim() === id && p.name.trim() === playlistName,
  )
  if (!inList) {
    throw new Error('playlist not in musicLibrary after createManualPlaylist')
  }

  return {
    playlist: { id, name: playlistName },
    playlists: json.playlists ?? [],
  }
}
