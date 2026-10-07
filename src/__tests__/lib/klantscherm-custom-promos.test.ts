import {
  klantschermCustomPromosFromLegacy,
  klantschermCustomPromosToLegacyUploads,
} from '@/lib/klantscherm-custom-promos'

describe('klantscherm custom promos legacy', () => {
  it('skips video legacy uploads', () => {
    const rows = klantschermCustomPromosFromLegacy([
      { url: 'https://cdn/a.mp4', sort: 0, mediaType: 'video' },
      { url: 'https://cdn/b.jpg', sort: 1, mediaType: 'image' },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.url).toContain('b.jpg')
  })

  it('mirrors custom promos to legacy slideshow uploads', () => {
    const legacy = klantschermCustomPromosToLegacyUploads([
      {
        url: 'https://cdn/x.jpg',
        sort: 2,
        title: 'X',
        description: '',
        displayPrice: '',
        promoText: '',
      },
    ])
    expect(legacy).toEqual([{ url: 'https://cdn/x.jpg', sort: 2, mediaType: 'image' }])
  })
})
