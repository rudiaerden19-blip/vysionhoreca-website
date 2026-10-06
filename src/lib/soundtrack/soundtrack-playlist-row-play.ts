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
 * Alleen Soundtrack: setPlayFrom → play → skipTracks(trackIndex).
 * `trackIndex` = 0-based positie in snapshot.playlist (rij 1 → 0).
 */
export async function playSoundtrackPlaylistRow(
  apiBase: string,
  playlistSourceId: string,
  trackIndex: number,
): Promise<{ ok: boolean; error?: string; snapshot?: unknown }> {
  const source = playlistSourceId.trim()
  if (!source) return { ok: false, error: 'playlist source id required' }

  const index = Math.max(0, Math.floor(trackIndex))
  let lastSnapshot: unknown

  const steps: Array<() => Promise<{ ok: boolean; error?: string; snapshot?: unknown }>> = [
    () => postSoundtrackMutation(apiBase, 'setPlayFrom', { source }),
    () => postSoundtrackMutation(apiBase, 'play', {}),
  ]
  if (index > 0) {
    steps.push(() =>
      postSoundtrackMutation(apiBase, 'skipTracks', {
        tracksToSkip: index,
        crossfade: true,
      }),
    )
  }

  for (const step of steps) {
    const result = await step()
    if (!result.ok) return { ok: false, error: result.error }
    if (result.snapshot != null) lastSnapshot = result.snapshot
  }

  return { ok: true, snapshot: lastSnapshot }
}
