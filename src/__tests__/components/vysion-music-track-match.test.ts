import {
  vysionMusicPlaylistRowIsActivePlayFrom,
  vysionMusicTrackRowIsNowPlaying,
} from '@/components/vysion-music/vysion-music-track-match'

describe('vysionMusicPlaylistRowIsActivePlayFrom', () => {
  it('active when playFrom matches and nowPlaying track is in playlist', () => {
    expect(
      vysionMusicPlaylistRowIsActivePlayFrom('pl-disco', 'pl-disco', 'track-a', [
        'track-a',
        'track-b',
      ]),
    ).toBe(true)
  })

  it('not active when playFrom matches but nowPlaying is queued search track', () => {
    expect(
      vysionMusicPlaylistRowIsActivePlayFrom('pl-disco', 'pl-disco', 'track-rak', [
        'track-a',
        'track-b',
      ]),
    ).toBe(false)
  })

  it('falls back to playFrom when playlist tracks not cached yet', () => {
    expect(
      vysionMusicPlaylistRowIsActivePlayFrom('pl-disco', 'pl-disco', 'track-a', null),
    ).toBe(true)
  })
})

describe('vysionMusicTrackRowIsNowPlaying', () => {
  const row = {
    id: 'lib-track-1',
    name: 'Red Red Wine',
    artist: 'UB40',
    durationMs: 180_000,
    imageUrl: null,
  }

  it('matches only on exact track id', () => {
    expect(
      vysionMusicTrackRowIsNowPlaying(row, {
        id: 'lib-track-1',
        name: 'Other',
        artist: 'X',
      }),
    ).toBe(true)
  })

  it('does not match on title and artist when ids differ', () => {
    expect(
      vysionMusicTrackRowIsNowPlaying(row, {
        id: 'runtime-track-99',
        name: '  Red Red Wine ',
        artist: 'ub40',
      }),
    ).toBe(false)
  })

  it('does not match different songs', () => {
    expect(
      vysionMusicTrackRowIsNowPlaying(row, {
        id: 'runtime-track-99',
        name: 'Blue',
        artist: 'UB40',
      }),
    ).toBe(false)
  })
})
