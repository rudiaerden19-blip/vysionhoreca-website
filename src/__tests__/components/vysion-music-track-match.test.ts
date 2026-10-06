import { vysionMusicTrackRowIsNowPlaying } from '@/components/vysion-music/vysion-music-track-match'

describe('vysionMusicTrackRowIsNowPlaying', () => {
  const row = {
    id: 'lib-track-1',
    name: 'Red Red Wine',
    artist: 'UB40',
    durationMs: 180_000,
    imageUrl: null,
  }

  it('matches on track id', () => {
    expect(
      vysionMusicTrackRowIsNowPlaying(row, {
        id: 'lib-track-1',
        name: 'Other',
        artist: 'X',
      }),
    ).toBe(true)
  })

  it('matches on title and artist when ids differ', () => {
    expect(
      vysionMusicTrackRowIsNowPlaying(row, {
        id: 'runtime-track-99',
        name: '  Red Red Wine ',
        artist: 'ub40',
      }),
    ).toBe(true)
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

  it('matches remastered list title to plain now playing title', () => {
    expect(
      vysionMusicTrackRowIsNowPlaying(
        {
          ...row,
          id: 'pl-1',
          name: 'Easy Lover (Remastered)',
          artist: 'Philip Bailey',
        },
        { id: 'zone-9', name: 'Easy Lover', artist: 'Philip Bailey' },
      ),
    ).toBe(true)
  })

  it('matches when snapshot artist is primary name only', () => {
    expect(
      vysionMusicTrackRowIsNowPlaying(
        {
          ...row,
          id: 'pl-2',
          name: 'Alive And Kicking',
          artist: 'Simple Minds',
        },
        { id: 'zone-2', name: 'Alive and Kicking', artist: 'Simple Minds, Jim Kerr' },
      ),
    ).toBe(true)
  })
})
