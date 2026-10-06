import { getAuthHeaders } from '@/lib/auth-headers'

/** Eén Soundtrack-mutatie via Vysion BFF (`mutation` = GraphQL-mutatienaam). */
async function postSoundtrackMutation(
  apiBase: string,
  mutation: string,
  input: Record<string, unknown> = {},
): Promise<{ ok: boolean; error?: string; snapshot?: unknown }> {
  const res = await fetch(apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ mutation, input }),
  })
  const json = (await res.json()) as { ok?: boolean; error?: string; snapshot?: unknown }
  const ok = res.ok && json.ok !== false
  return { ok, error: json.error, snapshot: json.snapshot }
}

/**
 * Track kiezen in de huidige Soundtrack-afspeellijst (linkerpaneel).
 * Eén POST: `playFromTrackIndex` (setPlayFrom + play + skip, of skip vooruit).
 */
export async function playSoundtrackPlaylistRow(
  apiBase: string,
  playlistSourceId: string,
  trackIndex: number,
  opts?: {
    activeSourceId?: string | null
    currentTrackId?: string | null
    playlistTrackIds?: string[] | null
  },
): Promise<{ ok: boolean; error?: string; snapshot?: unknown }> {
  const source = playlistSourceId.trim()
  if (!source) return { ok: false, error: 'playlist source id required' }

  const index = Math.max(0, Math.floor(trackIndex))
  return postSoundtrackMutation(apiBase, 'playFromTrackIndex', {
    source,
    trackIndex: index,
    activeSourceId: opts?.activeSourceId ?? null,
    currentTrackId: opts?.currentTrackId ?? null,
    playlistTrackIds: opts?.playlistTrackIds ?? null,
  })
}
