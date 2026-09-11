import { hasShopHeroSlideUrl, nextShopHeroSlideIndex } from '@/lib/shop-hero-slides'

describe('shop hero slides', () => {
  it('negeert lege foto-slots', () => {
    expect(hasShopHeroSlideUrl('')).toBe(false)
    expect(hasShopHeroSlideUrl('   ')).toBe(false)
    expect(hasShopHeroSlideUrl(null)).toBe(false)
    expect(hasShopHeroSlideUrl('https://cdn.example/a.jpg')).toBe(true)
  })

  it('blijft op 1 foto staan', () => {
    expect(nextShopHeroSlideIndex(0, 1)).toBe(0)
    expect(nextShopHeroSlideIndex(0, 0)).toBe(0)
  })

  it('slidet alleen over gevulde foto’s', () => {
    expect(nextShopHeroSlideIndex(0, 2)).toBe(1)
    expect(nextShopHeroSlideIndex(1, 2)).toBe(0)
    expect(nextShopHeroSlideIndex(0, 3)).toBe(1)
    expect(nextShopHeroSlideIndex(2, 3)).toBe(0)
  })
})
