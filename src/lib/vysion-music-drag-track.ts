export const VYSION_MUSIC_DRAG_TRACK_MIME = 'application/vnd.vysion-music-track+json'

export type VysionMusicDragTrack = {
  id: string
  name: string
  artist: string
  durationMs: number
  imageUrl: string | null
}

export function writeDragTrack(dataTransfer: DataTransfer, track: VysionMusicDragTrack): void {
  const payload = JSON.stringify(track)
  dataTransfer.setData(VYSION_MUSIC_DRAG_TRACK_MIME, payload)
  dataTransfer.setData('text/plain', `${track.artist} – ${track.name}`)
  dataTransfer.effectAllowed = 'copy'
}

export function readDragTrack(dataTransfer: DataTransfer): VysionMusicDragTrack | null {
  const raw =
    dataTransfer.getData(VYSION_MUSIC_DRAG_TRACK_MIME) ||
    dataTransfer.getData('application/vnd.vysion-music-track')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as VysionMusicDragTrack
    if (!parsed?.id || !parsed?.name) return null
    return {
      id: String(parsed.id),
      name: String(parsed.name),
      artist: String(parsed.artist ?? ''),
      durationMs: Number(parsed.durationMs) || 0,
      imageUrl: parsed.imageUrl ?? null,
    }
  } catch {
    return null
  }
}
