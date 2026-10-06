import {
  vysionMusicNowPlayingBelongsToPlaylistTracks,
  vysionMusicPlaylistRowIsActivePlayFrom,
  vysionMusicTrackRowIsNowPlaying,
} from '@/components/vysion-music/vysion-music-track-match'

const now = { id: 'runtime-99', name: 'Red Red Wine', artist: 'UB40' }

describe('vysionMusicPlaylistRowIsActivePlayFrom', () => {
  const tracks = [
    { id: 'lib-1', name: 'Red Red Wine', artist: 'UB40', durationMs: 1, imageUrl: null },
    { id: 'lib-2', name: 'Blue', artist: 'UB40', durationMs: 1, imageUrl: null },
  ]

  it('active when playFrom matches and nowPlaying track is in playlist by id', () => {
    expect(
      vysionMusicPlaylistRowIsActivePlayFrom(
        'pl-disco',
        'pl-disco',
        { id: 'track-a', name: 'X', artist: 'Y' },
        ['track-a', 'track-b'],
        tracks,
      ),
    ).toBe(true)
  })

  it('active when playFrom matches and nowPlaying matches playlist row by title (runtime id)', () => {
    expect(
      vysionMusicPlaylistRowIsActivePlayFrom('pl-disco', 'pl-disco', now, ['lib-1', 'lib-2'], tracks),
    ).toBe(true)
  })

  it('not active when playFrom matches but nowPlaying is queued search track', () => {
    expect(
      vysionMusicPlaylistRowIsActivePlayFrom(
        'pl-disco',
        'pl-disco',
        { id: 'track-rak', name: 'Random', artist: 'Artist' },
        ['track-a', 'track-b'],
        tracks,
      ),
    ).toBe(false)
  })

  it('falls back to playFrom when playlist tracks not cached yet', () => {
    expect(
      vysionMusicPlaylistRowIsActivePlayFrom(
        'pl-disco',
        'pl-disco',
        { id: 'track-a', name: 'X', artist: 'Y' },
        null,
        null,
      ),
    ).toBe(true)
  })
})

describe('vysionMusicNowPlayingBelongsToPlaylistTracks', () => {
  it('matches by title when ids differ', () => {
    expect(
      vysionMusicNowPlayingBelongsToPlaylistTracks(now, ['lib-1'], [
        { id: 'lib-1', name: 'Red Red Wine', artist: 'UB40', durationMs: 0, imageUrl: null },
      ]),
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

  it('matches on exact track id', () => {
    expect(
      vysionMusicTrackRowIsNowPlaying(row, {
        id: 'lib-track-1',
        name: 'Other',
        artist: 'X',
      }),
    ).toBe(true)
  })

  it('matches title+artist in playlist column when ids differ', () => {
    expect(
      vysionMusicTrackRowIsNowPlaying(row, now, { allowTitleArtistFallback: true }),
    ).toBe(true)
  })

  it('does not meta-match in search column by default', () => {
    expect(vysionMusicTrackRowIsNowPlaying(row, now)).toBe(false)
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
