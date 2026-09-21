import { MARKETING_FAQ_KASSA_AANPASSEN } from '@/lib/marketing-kassa-aanpassen-faq'
import {
  SECTOR_LANDINGS,
  SECTOR_LANDING_SLUGS,
  sectorBreadcrumbJsonLd,
  sectorFaqJsonLd,
  sectorLandingMetadata,
} from '@/lib/sector-landings'
import { MARKETING_SITEMAP_ENTRIES } from '@/lib/marketing-sitemap-paths'
import { KLEDINGWINKEL_H1, KLEDINGWINKEL_TITLE } from '@/lib/kledingwinkel-landing'
import { landingBranchFromPathname } from '@/lib/landing-branch-choice'

describe('sector landings', () => {
  it('gives each sector a unique title, H1, description and intro', () => {
    const titles = SECTOR_LANDING_SLUGS.map((slug) => SECTOR_LANDINGS[slug].title)
    const h1s = SECTOR_LANDING_SLUGS.map((slug) => SECTOR_LANDINGS[slug].h1)
    const descriptions = SECTOR_LANDING_SLUGS.map((slug) => SECTOR_LANDINGS[slug].description)
    const intros = SECTOR_LANDING_SLUGS.map((slug) => SECTOR_LANDINGS[slug].intro)

    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(h1s).size).toBe(h1s.length)
    expect(new Set(descriptions).size).toBe(descriptions.length)
    expect(new Set(intros).size).toBe(intros.length)
    expect(h1s).not.toContain(KLEDINGWINKEL_H1)
    expect(titles).not.toContain(KLEDINGWINKEL_TITLE)
  })

  it('does not copy superlatives or i9 doorway copy', () => {
    for (const landing of Object.values(SECTOR_LANDINGS)) {
      const blob = [landing.title, landing.description, landing.h1, landing.intro, ...landing.sections.flatMap((s) => s.body)].join(' ')
      expect(blob.toLowerCase()).not.toMatch(/snelste|#1|nummer 1|beste kassa/)
      expect(landing.title.toLowerCase()).not.toContain('i9')
    }
  })

  it('includes kassa-aanpassen FAQ on every sector landing', () => {
    for (const slug of SECTOR_LANDING_SLUGS) {
      const faqs = SECTOR_LANDINGS[slug].faqs
      expect(faqs.some((f) => f.question === MARKETING_FAQ_KASSA_AANPASSEN.question)).toBe(true)
      const match = faqs.find((f) => f.question === MARKETING_FAQ_KASSA_AANPASSEN.question)
      expect(match?.answer).toBe(MARKETING_FAQ_KASSA_AANPASSEN.answer)
    }
  })

  it('matches FAQ JSON-LD to visible questions and answers', () => {
    for (const landing of Object.values(SECTOR_LANDINGS)) {
      const schema = sectorFaqJsonLd(landing)
      expect(schema['@type']).toBe('FAQPage')
      expect(schema.mainEntity).toHaveLength(landing.faqs.length)
      schema.mainEntity.forEach((entity, index) => {
        expect(entity.name).toBe(landing.faqs[index].question)
        expect(entity.acceptedAnswer.text).toBe(landing.faqs[index].answer)
      })
    }
  })

  it('matches breadcrumb JSON-LD to the visible trail', () => {
    const bakery = sectorBreadcrumbJsonLd(SECTOR_LANDINGS.bakkerij)
    expect(bakery.itemListElement.map((item) => item.name)).toEqual([
      'Home',
      'Winkels & retail',
      'Bakkerij',
    ])
    expect(bakery.itemListElement.map((item) => item.item)).toEqual([
      'https://www.vysion-kassa.com/',
      'https://www.vysion-kassa.com/winkel',
      'https://www.vysion-kassa.com/sectoren/bakkerij',
    ])

    const cafe = sectorBreadcrumbJsonLd(SECTOR_LANDINGS.cafe)
    expect(cafe.itemListElement.map((item) => item.name)).toEqual(['Home', 'Café'])
    expect(cafe.itemListElement.map((item) => item.item)).toEqual([
      'https://www.vysion-kassa.com/',
      'https://www.vysion-kassa.com/sectoren/cafe',
    ])
  })

  it('indexes sector pages with a self-canonical', () => {
    const meta = sectorLandingMetadata('restaurant')
    expect(meta.alternates).toEqual({ canonical: '/sectoren/restaurant' })
    expect(meta.robots).toEqual({ index: true, follow: true })
  })

  it('keeps shop sectors on the winkel marketing branch', () => {
    expect(landingBranchFromPathname('/sectoren/bakkerij')).toBe('winkel')
    expect(landingBranchFromPathname('/sectoren/slagerij')).toBe('winkel')
    expect(landingBranchFromPathname('/sectoren/kapper')).toBe('winkel')
    expect(landingBranchFromPathname('/sectoren/nachtwinkel')).toBe('winkel')
    expect(landingBranchFromPathname('/sectoren/kledingwinkel')).toBe('winkel')
    expect(landingBranchFromPathname('/sectoren/cafe')).toBe('horeca')
    expect(landingBranchFromPathname('/sectoren/frituur')).toBe('horeca')
    expect(landingBranchFromPathname('/sectoren/kebab')).toBe('horeca')
    expect(landingBranchFromPathname('/sectoren/restaurant')).toBe('horeca')
  })

  it('lists only indexable sector pages in the sitemap', () => {
    const paths = MARKETING_SITEMAP_ENTRIES.map((entry) => entry.path)
    expect(paths).toHaveLength(30)
    expect(new Set(paths).size).toBe(30)
    expect(paths).not.toContain('/sectoren/retail')
    expect(paths).toEqual(expect.arrayContaining([
      '/winkel',
      '/sectoren/kledingwinkel',
      '/sectoren/bakkerij',
      '/sectoren/kapper',
      '/sectoren/cafe',
      '/sectoren/frituur',
      '/sectoren/kebab',
      '/sectoren/slagerij',
      '/sectoren/restaurant',
      '/sectoren/nachtwinkel',
    ]))
  })
})
