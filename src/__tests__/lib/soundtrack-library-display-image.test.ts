import { soundtrackLibraryListImageUrl } from '@/lib/soundtrack/soundtrack-playlists'

describe('soundtrackLibraryListImageUrl', () => {
  it('uses display.image thumbnail like Soundtrack desktop list', () => {
    const url = soundtrackLibraryListImageUrl({
      display: {
        image: {
          sizes: {
            thumbnail: 'https://i.soundcdn.com/k/100/100/soundtrack:artwork:abc/thumbnail.jpg',
            teaser: 'https://i.soundcdn.com/k/200/200/soundtrack:artwork:abc/teaser.jpg',
          },
        },
      },
    })
    expect(url).toContain('soundtrack:artwork:abc')
    expect(url).toMatch(/100.*100|thumbnail/)
  })

  it('falls back to display.image.size', () => {
    const url = soundtrackLibraryListImageUrl({
      display: {
        image: {
          size: 'https://i.soundcdn.com/k/100/100/soundtrack:artwork:xyz/size.jpg',
        },
      },
    })
    expect(url).toContain('soundtrack:artwork:xyz')
  })
})
