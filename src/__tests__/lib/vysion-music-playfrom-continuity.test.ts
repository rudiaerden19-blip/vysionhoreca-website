import { sourceTrackIndexInCatalog } from '@/lib/vysion-music-playfrom-continuity'

describe('sourceTrackIndexInCatalog', () => {
  const tracks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('returns zero-based index for track id', () => {
    expect(sourceTrackIndexInCatalog(tracks, 'b')).toBe(1)
  })

  it('returns undefined when track missing', () => {
    expect(sourceTrackIndexInCatalog(tracks, 'z')).toBeUndefined()
  })
})
