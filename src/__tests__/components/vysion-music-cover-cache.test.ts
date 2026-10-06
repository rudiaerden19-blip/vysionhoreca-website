import {
  lookupVysionMusicCoverArt,
  rememberVysionMusicCoverArt,
} from '@/components/vysion-music/vysion-music-cover-cache'

describe('vysion-music-cover-cache', () => {
  it('falls back to cached art when snapshot track has no imageUrl', () => {
    const cache = new Map<string, string>()
    rememberVysionMusicCoverArt(cache, {
      id: 't1',
      name: 'Love Me',
      artist: 'Elvis Presley',
      imageUrl: 'https://i.soundcdn.com/k/400/400/soundtrack:artwork:x',
    })
    expect(
      lookupVysionMusicCoverArt(cache, {
        id: 't1',
        name: 'Love Me',
        artist: 'Elvis Presley',
        imageUrl: null,
      }),
    ).toBe('https://i.soundcdn.com/k/400/400/soundtrack:artwork:x')
  })
})
