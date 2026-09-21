import {
  KLEDINGWINKEL_FAQS,
  KLEDINGWINKEL_H1,
  KLEDINGWINKEL_PATH,
  KLEDINGWINKEL_TITLE,
  kledingwinkelBreadcrumbJsonLd,
  kledingwinkelCanonicalUrl,
  kledingwinkelFaqJsonLd,
} from '@/lib/kledingwinkel-landing'
import { MARKETING_SITEMAP_ENTRIES } from '@/lib/marketing-sitemap-paths'

describe('kledingwinkel landing', () => {
  it('keeps one clear H1 and a shop-intent title', () => {
    expect(KLEDINGWINKEL_H1).toBe('Kassasysteem voor jouw kledingwinkel')
    expect(KLEDINGWINKEL_TITLE).toBe('Kassasysteem voor kledingwinkels | Vysion kassa')
    expect(KLEDINGWINKEL_PATH).toBe('/sectoren/kledingwinkel')
    expect(kledingwinkelCanonicalUrl()).toBe('https://www.vysion-kassa.com/sectoren/kledingwinkel')
  })

  it('matches FAQ JSON-LD to the visible questions and answers', () => {
    const schema = kledingwinkelFaqJsonLd()
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity).toHaveLength(KLEDINGWINKEL_FAQS.length)
    schema.mainEntity.forEach((entity, index) => {
      expect(entity.name).toBe(KLEDINGWINKEL_FAQS[index].question)
      expect(entity.acceptedAnswer.text).toBe(KLEDINGWINKEL_FAQS[index].answer)
    })
  })

  it('matches breadcrumb JSON-LD to the visible trail', () => {
    const schema = kledingwinkelBreadcrumbJsonLd()
    expect(schema['@type']).toBe('BreadcrumbList')
    expect(schema.itemListElement.map((item) => item.name)).toEqual([
      'Home',
      'Winkels & retail',
      'Kledingwinkel',
    ])
    expect(schema.itemListElement.map((item) => item.item)).toEqual([
      'https://www.vysion-kassa.com/',
      'https://www.vysion-kassa.com/winkel',
      'https://www.vysion-kassa.com/sectoren/kledingwinkel',
    ])
  })

  it('adds the clothing page to the marketing sitemap as the 28th URL', () => {
    const paths = MARKETING_SITEMAP_ENTRIES.map((entry) => entry.path)
    expect(paths).toHaveLength(28)
    expect(new Set(paths).size).toBe(28)
    expect(paths).toContain('/sectoren/kledingwinkel')
    expect(paths).toContain('/winkel')
    expect(paths).toContain('/sectoren/retail')
  })
})
