import {
  vysionMusicLibraryCoverProxyUrl,
  vysionMusicLibraryPlaceholderLetter,
} from '@/components/vysion-music/vysion-music-library-thumb'

describe('vysionMusicLibraryPlaceholderLetter', () => {
  it('uses first letter uppercase for playlist names', () => {
    expect(vysionMusicLibraryPlaceholderLetter('TEST VYSION')).toBe('T')
  })

  it('falls back to music symbol when name is empty', () => {
    expect(vysionMusicLibraryPlaceholderLetter('   ')).toBe('♪')
  })
})

describe('vysionMusicLibraryCoverProxyUrl', () => {
  it('returns null for missing or non-http urls', () => {
    expect(vysionMusicLibraryCoverProxyUrl(null)).toBeNull()
    expect(vysionMusicLibraryCoverProxyUrl('/relative.jpg')).toBeNull()
  })

  it('proxies soundcdn http urls', () => {
    const url = 'https://i.soundcdn.com/k/1/1/soundtrack:artwork:x/t.jpg'
    expect(vysionMusicLibraryCoverProxyUrl(url)).toContain('/api/soundtrack/cover?url=')
  })
})
