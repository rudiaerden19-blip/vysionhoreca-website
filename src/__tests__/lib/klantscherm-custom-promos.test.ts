import {
  klantschermCustomPromosFromLegacy,
  klantschermCustomPromosToLegacyUploads,
  mergeKlantschermCustomPromoSources,
  parseKlantschermCustomPromos,
  shouldSkipEmptyKlantschermPromoOverwrite,
} from '@/lib/klantscherm-custom-promos'
import { klantschermSlidesFromSettingsRow } from '@/lib/klantscherm-slideshow-server'

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

  it('lomichillplay: drie opgeslagen promos → drie slides', () => {
    const settings = {
      klantscherm_custom_promos: [
        {
          url: 'https://eubncywfaexrsdonavfc.supabase.co/storage/v1/object/public/media/lomichillplay/klantscherm/1791416111408.jpeg',
          sort: 0,
          title: 'Onze burgers',
          displayPrice: '6,50',
        },
        {
          url: 'https://eubncywfaexrsdonavfc.supabase.co/storage/v1/object/public/media/lomichillplay/klantscherm/1791417043877.jpeg',
          sort: 1,
          title: 'Donderdag pizza dag',
          displayPrice: '8,5',
        },
        {
          url: 'https://eubncywfaexrsdonavfc.supabase.co/storage/v1/object/public/media/lomichillplay/klantscherm/1791489838549.jpg',
          sort: 2,
          title: 'Promo deal',
          description: 'Bij aankoop van 2 burgers- frietjes gratis',
          displayPrice: '11,50',
        },
      ],
      klantscherm_slideshow_uploads: [
        {
          url: 'https://eubncywfaexrsdonavfc.supabase.co/storage/v1/object/public/media/lomichillplay/klantscherm/1791416111408.jpeg',
          sort: 0,
          mediaType: 'image',
        },
        {
          url: 'https://eubncywfaexrsdonavfc.supabase.co/storage/v1/object/public/media/lomichillplay/klantscherm/1791417043877.jpeg',
          sort: 1,
          mediaType: 'image',
        },
        {
          url: 'https://eubncywfaexrsdonavfc.supabase.co/storage/v1/object/public/media/lomichillplay/klantscherm/1791489838549.jpg',
          sort: 2,
          mediaType: 'image',
        },
      ],
    }
    const slides = klantschermSlidesFromSettingsRow(settings)
    expect(slides).toHaveLength(3)
    expect(slides.map((s) => s.title)).toEqual([
      'Onze burgers',
      'Donderdag pizza dag',
      'Promo deal',
    ])
  })

  it('blokkeert lege save wanneer DB promos heeft', () => {
    expect(
      shouldSkipEmptyKlantschermPromoOverwrite([], [{ url: 'https://cdn/a.jpg', sort: 0, title: '', description: '', displayPrice: '', promoText: '' }]),
    ).toBe(true)
    expect(shouldSkipEmptyKlantschermPromoOverwrite([], [])).toBe(false)
    expect(
      shouldSkipEmptyKlantschermPromoOverwrite(
        [{ url: 'https://cdn/b.jpg', sort: 0, title: '', description: '', displayPrice: '', promoText: '' }],
        [{ url: 'https://cdn/a.jpg', sort: 0, title: '', description: '', displayPrice: '', promoText: '' }],
      ),
    ).toBe(false)
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
