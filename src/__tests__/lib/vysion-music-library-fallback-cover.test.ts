import {
  vysionMusicLibraryFallbackCoverColors,
  vysionMusicLibraryFallbackCoverPath,
  vysionMusicLibraryFallbackCoverSvg,
} from '@/lib/vysion-music/vysion-music-library-fallback-cover'

describe('vysionMusicLibraryFallbackCover', () => {
  it('builds stable api path per name', () => {
    expect(vysionMusicLibraryFallbackCoverPath('Disco')).toContain('/api/soundtrack/library-cover?name=')
    expect(vysionMusicLibraryFallbackCoverPath('Disco')).toBe(
      vysionMusicLibraryFallbackCoverPath('Disco'),
    )
  })

  it('svg contains letter and gradient', () => {
    const svg = vysionMusicLibraryFallbackCoverSvg('Nederlands')
    expect(svg).toContain('<svg')
    expect(svg).toContain('>N<')
    expect(svg).toContain('linearGradient')
  })

  it('colors are stable for same playlist name', () => {
    expect(vysionMusicLibraryFallbackCoverColors('Duits')).toEqual(
      vysionMusicLibraryFallbackCoverColors('Duits'),
    )
  })
})
