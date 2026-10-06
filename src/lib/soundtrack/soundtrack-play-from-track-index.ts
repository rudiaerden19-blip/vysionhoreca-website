/** Hoe een track in de huidige Soundtrack playFrom-playlist starten. */
export type PlayFromTrackPlan =
  | { kind: 'resume' }
  | { kind: 'skip_forward'; tracksToSkip: number }
  | { kind: 'restart_at'; trackIndex: number }

export function planPlaylistTrackPlay(
  sameSource: boolean,
  currentIndex: number | null,
  targetIndex: number,
): PlayFromTrackPlan {
  const target = Math.max(0, Math.floor(targetIndex))
  if (!sameSource || currentIndex == null || currentIndex < 0) {
    return { kind: 'restart_at', trackIndex: target }
  }
  if (target === currentIndex) return { kind: 'resume' }
  if (target > currentIndex) {
    return { kind: 'skip_forward', tracksToSkip: target - currentIndex }
  }
  return { kind: 'restart_at', trackIndex: target }
}

export const SOUNDTRACK_PLAY_FROM_SETTLE_MS = 520
