export type TrackFadeFields = {
  id?: string
  name?: string
  artist?: string
}

/** Zelfde duur als Soundtrack zone crossfade + CSS `--vm-track-crossfade`. */
export const VYSION_MUSIC_TRACK_FADE_MS = 3000

export function trackIdentity(t: TrackFadeFields | null | undefined): string {
  if (!t) return ''
  const id = t.id?.trim()
  if (id && !id.startsWith('placeholder')) return id
  return `${(t.name ?? '').trim()}|${(t.artist ?? '').trim()}`
}
