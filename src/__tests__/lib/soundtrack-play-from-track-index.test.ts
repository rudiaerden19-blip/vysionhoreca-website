import {
  planPlaylistTrackPlay,
} from '@/lib/soundtrack/soundtrack-play-from-track-index'

describe('planPlaylistTrackPlay', () => {
  it('restarts at index when source differs', () => {
    expect(planPlaylistTrackPlay(false, 2, 5)).toEqual({ kind: 'restart_at', trackIndex: 5 })
  })

  it('skips forward within same playlist', () => {
    expect(planPlaylistTrackPlay(true, 1, 4)).toEqual({ kind: 'skip_forward', tracksToSkip: 3 })
  })

  it('resumes when same track selected', () => {
    expect(planPlaylistTrackPlay(true, 3, 3)).toEqual({ kind: 'resume' })
  })

  it('restarts when jumping backwards', () => {
    expect(planPlaylistTrackPlay(true, 5, 2)).toEqual({ kind: 'restart_at', trackIndex: 2 })
  })

  it('restarts when current track not in list', () => {
    expect(planPlaylistTrackPlay(true, null, 2)).toEqual({ kind: 'restart_at', trackIndex: 2 })
  })
})
