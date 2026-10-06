import {
  mapSoundtrackTrackRow,
  soundtrackTrackArtUrlFromAlbum,
} from '@/lib/soundtrack/soundtrack-track-map'

describe('mapSoundtrackTrackRow', () => {
  it('maps Soundtrack v2 title, durationMs and display image sizes', () => {
    const row = mapSoundtrackTrackRow({
      id: 'track-1',
      title: 'Red Red Wine',
      durationMs: 184_000,
      artists: [{ name: 'UB40' }],
      album: {
        display: {
          image: {
            sizes: {
              teaser: 'https://i.soundcdn.com/k/400/400/soundtrack:artwork:abc',
            },
          },
        },
      },
    })
    expect(row).toEqual({
      id: 'track-1',
      name: 'Red Red Wine',
      artist: 'UB40',
      durationMs: 184_000,
      imageUrl: 'https://i.soundcdn.com/k/400/400/soundtrack:artwork:abc',
      imageWidth: null,
      imageHeight: null,
    })
  })

  it('returns null without id or title', () => {
    expect(mapSoundtrackTrackRow({ title: 'X' })).toBeNull()
    expect(mapSoundtrackTrackRow({ id: '1' })).toBeNull()
  })

  it('prefers teaser then hero for art', () => {
    const url = soundtrackTrackArtUrlFromAlbum({
      display: {
        image: {
          sizes: {
            thumbnail: 'https://i.soundcdn.com/k/100/100/soundtrack:artwork:t',
            hero: 'https://i.soundcdn.com/k/800/400/soundtrack:artwork:h',
          },
        },
      },
    })
    expect(url).toBe('https://i.soundcdn.com/k/800/800/soundtrack:artwork:h')
  })
})
