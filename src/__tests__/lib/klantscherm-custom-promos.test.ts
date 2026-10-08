import {
  klantschermCustomPromosFromLegacy,
  klantschermCustomPromosToLegacyUploads,
  mergeKlantschermCustomPromoSources,
  parseKlantschermCustomPromos,
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

  it('parses snake_case display fields from JSONB', () => {
    const rows = parseKlantschermCustomPromos([
      {
        url: 'https://cdn/x.jpg',
        sort: 0,
        title: 'Burger',
        display_price: '6,50',
        promo_text: 'Actie',
      },
    ])
    expect(rows[0]?.displayPrice).toBe('6,50')
    expect(rows[0]?.promoText).toBe('Actie')
  })

  it('merges legacy uploads when custom JSONB list is incomplete', () => {
    const u1 =
      'https://eubncywfaexrsdonavfc.supabase.co/storage/v1/object/public/media/demo/klantscherm/a.jpeg'
    const u2 =
      'https://eubncywfaexrsdonavfc.supabase.co/storage/v1/object/public/media/demo/klantscherm/b.jpeg'
    const merged = mergeKlantschermCustomPromoSources(
      [
        {
          url: u1,
          sort: 0,
          title: 'Burger',
          description: '',
          displayPrice: '6,50',
          promoText: '',
        },
      ],
      [
        { url: u1, sort: 0, mediaType: 'image' },
        { url: u2, sort: 1, mediaType: 'image' },
      ],
    )
    expect(merged).toHaveLength(2)
    expect(merged[0]?.title).toBe('Burger')
    expect(merged[1]?.url).toBe(u2)
  })

  it('parses custom promos from JSON string', () => {
    const rows = parseKlantschermCustomPromos(
      JSON.stringify([
        {
          url: 'https://cdn/x.jpg',
          sort: 0,
          title: 'X',
          description: '',
          displayPrice: '',
          promoText: '',
        },
      ]),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.title).toBe('X')
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
