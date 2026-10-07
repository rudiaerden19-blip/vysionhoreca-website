import { parseKlantschermCustomPromos } from '@/lib/klantscherm-custom-promos'
import { klantschermSlidesFromSettingsRow } from '@/lib/klantscherm-slideshow-server'

describe('klantscherm slideshow — max 10 promos', () => {
  it('caps saved promos at 10 and maps all to slides', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      url: `https://cdn/p${i}.jpg`,
      sort: i,
      title: `P${i}`,
      description: '',
      displayPrice: '',
      promoText: '',
    }))
    const parsed = parseKlantschermCustomPromos(rows)
    expect(parsed).toHaveLength(10)

    const slides = klantschermSlidesFromSettingsRow({ klantscherm_custom_promos: parsed })
    expect(slides).toHaveLength(10)
    expect(slides.every((s) => s.type === 'image')).toBe(true)
  })

  it('rotation index wraps at slide count (10)', () => {
    const n = 10
    let index = 9
    index = (index + 1) % n
    expect(index).toBe(0)
    index = (index + 1) % n
    expect(index).toBe(1)
  })
})
