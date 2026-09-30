import { soundtrackAlbumArtUrl } from '@/lib/soundtrack/soundtrack-album-art'

describe('soundtrackAlbumArtUrl', () => {
  it('uses square soundcdn variant for same artwork id', () => {
    const u =
      'https://i.soundcdn.com/k/1200/400/soundtrack:artwork:75ipVkQisn1xYzcpJgKqOp'
    expect(soundtrackAlbumArtUrl(u)).toBe(
      'https://i.soundcdn.com/k/1200/1200/soundtrack:artwork:75ipVkQisn1xYzcpJgKqOp',
    )
  })

  it('leaves already-square urls unchanged', () => {
    const u = 'https://i.soundcdn.com/k/600/600/soundtrack:artwork:abc'
    expect(soundtrackAlbumArtUrl(u)).toBe(u)
  })

  it('returns null for empty', () => {
    expect(soundtrackAlbumArtUrl('')).toBeNull()
  })
})
