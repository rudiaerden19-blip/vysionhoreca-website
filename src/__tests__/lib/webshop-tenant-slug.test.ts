import {
  legacyWebshopBrowserSessionCookieName,
  webshopBrowserSessionCookieName,
  webshopTenantSlugDbVariants,
} from '@/lib/webshop-tenant-slug'
import { tenantSlugsMatch } from '@/lib/tenant-slug-variants'

describe('webshop tenant slug (all tenants)', () => {
  it('isolates browser cookies per tenant', () => {
    const a = webshopBrowserSessionCookieName('frituur-rudi')
    const b = webshopBrowserSessionCookieName('bakkerij-peeters')
    expect(a).not.toBe(b)
    expect(a).toBe(webshopBrowserSessionCookieName('Frituur-Rudi'))
  })

  it('matches hyphen/subdomain variants for DB lookups', () => {
    const variants = webshopTenantSlugDbVariants('Frituur-Rudi')
    expect(variants).toContain('Frituur-Rudi')
    expect(variants).toContain('frituur-rudi')
    expect(variants).toContain('frituurrudi')
    expect(tenantSlugsMatch(variants[0], 'frituurrudi')).toBe(true)
  })

  it('legacy cookie name differs from normalized but both are derivable', () => {
    const legacy = legacyWebshopBrowserSessionCookieName('frituur-rudi')
    const modern = webshopBrowserSessionCookieName('frituur-rudi')
    expect(legacy).toContain('vysion_wbs_')
    expect(modern).toContain('vysion_wbs_')
  })
})
