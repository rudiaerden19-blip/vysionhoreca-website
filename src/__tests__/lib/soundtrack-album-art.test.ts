import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'

describe('soundtrackAlbumArtUrl', () => {
  it('returns trimmed url unchanged', () => {
    const u = 'https://i.soundcdn.com/x/640x200.jpg'
    expect(soundtrackAlbumArtUrl(u)).toBe(u)
  })

  it('returns null for empty', () => {
    expect(soundtrackAlbumArtUrl('')).toBeNull()
  })
})
