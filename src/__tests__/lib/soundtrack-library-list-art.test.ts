import {
  isSoundtrackGenericLibraryArtUrl,
  nullSharedSoundtrackPlaceholderListArt,
  pickSoundtrackLibraryListArtUrl,
} from '@/lib/soundtrack/soundtrack-library-list-art'

describe('isSoundtrackGenericLibraryArtUrl', () => {
  it('rejects urls without soundtrack artwork id', () => {
    expect(isSoundtrackGenericLibraryArtUrl('https://cdn.example/default-playlist.png')).toBe(true)
  })

  it('accepts real soundcdn artwork', () => {
    expect(
      isSoundtrackGenericLibraryArtUrl(
        'https://i.soundcdn.com/k/200/200/soundtrack:artwork:abc123/teaser.jpg',
      ),
    ).toBe(false)
  })
})

describe('pickSoundtrackLibraryListArtUrl', () => {
  it('prefers track art over generic display', () => {
    expect(
      pickSoundtrackLibraryListArtUrl(
        'https://i.soundcdn.com/default-playlist.png',
        'https://i.soundcdn.com/k/1/1/soundtrack:artwork:real/t.jpg',
      ),
    ).toContain('soundtrack:artwork:real')
  })

  it('uses real display when no track art', () => {
    const display = 'https://i.soundcdn.com/k/1/1/soundtrack:artwork:station/teaser.jpg'
    expect(pickSoundtrackLibraryListArtUrl(display, null)).toBe(display)
  })

  it('returns null for only generic icons', () => {
    expect(pickSoundtrackLibraryListArtUrl('https://x/default-playlist.png', null)).toBeNull()
  })
})

describe('nullSharedSoundtrackPlaceholderListArt', () => {
  const shared =
    'https://i.soundcdn.com/k/100/100/soundtrack:artwork:emptyListIcon/teaser.jpg'
  const unique =
    'https://i.soundcdn.com/k/100/100/soundtrack:artwork:uniqueCollage/teaser.jpg'

  it('clears imageUrl when the same artwork id appears on multiple lists', () => {
    const out = nullSharedSoundtrackPlaceholderListArt([
      { id: 'a', imageUrl: shared },
      { id: 'b', imageUrl: shared },
      { id: 'c', imageUrl: unique },
    ])
    expect(out[0].imageUrl).toBeNull()
    expect(out[1].imageUrl).toBeNull()
    expect(out[2].imageUrl).toBe(unique)
  })
})
