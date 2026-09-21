import {
  MARKETING_HOME_DESCRIPTION,
  MARKETING_HOME_TITLE,
} from '@/lib/marketing-home-seo'
import { MARKETING_SITEMAP_ENTRIES } from '@/lib/marketing-sitemap-paths'

describe('marketing SEO phase 4', () => {
  it('keeps homepage metadata focused on kassa without i9 in meta description', () => {
    expect(MARKETING_HOME_TITLE).toContain('Kassa')
    expect(MARKETING_HOME_TITLE).toContain('kassasysteem')
    expect(MARKETING_HOME_DESCRIPTION.toLowerCase()).not.toContain('i9')
    expect(MARKETING_HOME_DESCRIPTION.length).toBeLessThanOrEqual(180)
  })

  it('keeps sitemap free of redirects and retail duplicate', () => {
    const paths = MARKETING_SITEMAP_ENTRIES.map((e) => e.path)
    expect(paths).toHaveLength(30)
    expect(new Set(paths).size).toBe(30)
    expect(paths).not.toContain('/sectoren/retail')
    expect(paths).not.toContain('/retail')
  })
})
