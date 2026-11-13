import fs from 'node:fs'
import path from 'node:path'
import {
  lagoonTenantSettingsBeforeUpsert,
  normalizeLagoonTenantSettingsForRead,
  lagoonMenuCategoryDefaultBtwOnSave,
  resolveTenantBtwPercentage,
  THE_LAGOON_UNIFORM_VAT_PERCENT,
} from '@/lib/lagoon-vat'

describe('Lagoon BTW guards (persist + regressie)', () => {
  it('normalizeLagoonTenantSettingsForRead corrigeert DB 6 naar 21', () => {
    expect(
      normalizeLagoonTenantSettingsForRead('thelagoon', { btw_percentage: 6 }).btw_percentage,
    ).toBe(21)
  })

  it('lagoonTenantSettingsBeforeUpsert dwingt 21 bij elke save', () => {
    expect(
      lagoonTenantSettingsBeforeUpsert({
        tenant_slug: 'the-lagoon',
        business_name: 'X',
        btw_percentage: 6,
      }).btw_percentage,
    ).toBe(21)
    const partial = lagoonTenantSettingsBeforeUpsert({
      tenant_slug: 'thelagoon',
      report_register_opening_cash: 100,
    }) as unknown as { btw_percentage: number }
    expect(partial.btw_percentage).toBe(21)
  })

  it('andere tenant: guards zijn no-op', () => {
    expect(
      lagoonTenantSettingsBeforeUpsert({ tenant_slug: 'demo-frituur', btw_percentage: 6 }).btw_percentage,
    ).toBe(6)
    expect(lagoonMenuCategoryDefaultBtwOnSave('demo-frituur', 6)).toBe(6)
  })

  it('menu-categorie default btw voor Lagoon altijd 21', () => {
    expect(lagoonMenuCategoryDefaultBtwOnSave('thelagoon', 6)).toBe(THE_LAGOON_UNIFORM_VAT_PERCENT)
    expect(lagoonMenuCategoryDefaultBtwOnSave('thelagoon', null)).toBe(THE_LAGOON_UNIFORM_VAT_PERCENT)
  })
})

describe('Lagoon VAT choke points — admin-api moet guards importeren', () => {
  const repoRoot = path.join(__dirname, '../../..')

  it('admin-api koppelt tenant_settings read/write aan lagoon-vat', () => {
    const src = fs.readFileSync(path.join(repoRoot, 'src/lib/admin-api.ts'), 'utf8')
    expect(src).toMatch(/normalizeLagoonTenantSettingsForRead/)
    expect(src).toMatch(/lagoonTenantSettingsBeforeUpsert/)
  })

  it('resolveTenantBtwPercentage blijft 21 ongeacht raw (contract)', () => {
    for (const slug of ['thelagoon', 'the-lagoon']) {
      expect(resolveTenantBtwPercentage(slug, 0, 6)).toBe(21)
      expect(resolveTenantBtwPercentage(slug, 12, 6)).toBe(21)
    }
  })
})
