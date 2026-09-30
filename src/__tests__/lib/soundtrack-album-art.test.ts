import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'

describe('soundtrackAlbumArtUrl', () => {
  it('returns url unchanged for square art', () => {
    const u = 'https://i.soundcdn.com/x/300x300.jpg'
    expect(soundtrackAlbumArtUrl(u, { width: 300, height: 300 })).toBe(u)
  })

  it('rewrites wide banner urls to square when path has WxH', () => {
    const u = 'https://i.soundcdn.com/x/640x200.jpg'
    expect(soundtrackAlbumArtUrl(u, { width: 640, height: 200 })).toBe(
      'https://i.soundcdn.com/x/200x200.jpg',
    )
  })
})
