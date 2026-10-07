import { validateKlantschermPromoImageFile } from '@/lib/klantscherm-slideshow-media'
import {
  KLANTSCHERM_CUSTOM_PROMO_MAX,
  mergeKlantschermCustomPromosForSave,
  parseKlantschermCustomPromos,
} from '@/lib/klantscherm-custom-promos'

describe('klantscherm slideshow media', () => {
  it('validates promo image file', () => {
    const f = new File(['x'], 'clip.jpg', { type: 'image/jpeg' })
    expect(validateKlantschermPromoImageFile(f)).toEqual({ ok: true })
  })

  it('parses custom promos and caps at 10', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      url: `https://cdn/p${i}.jpg`,
      sort: i,
      title: `T${i}`,
    }))
    expect(parseKlantschermCustomPromos(rows)).toHaveLength(KLANTSCHERM_CUSTOM_PROMO_MAX)
  })

  it('merge keeps display fields', () => {
    const merged = mergeKlantschermCustomPromosForSave([
      {
        url: 'https://cdn/a.jpg',
        sort: 0,
        title: 'Friet',
        description: 'Lekker',
        displayPrice: '5.50',
        promoText: '50% vandaag',
      },
    ])
    expect(merged[0]?.promoText).toBe('50% vandaag')
  })
})
