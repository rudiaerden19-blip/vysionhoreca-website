import fs from 'node:fs'
import path from 'node:path'
import {
  aggregateZReportVatForTenant,
  lagoonTenantSettingsBeforeUpsert,
  normalizeLagoonStoredZReportVat,
  normalizeLagoonTenantSettingsForRead,
  lagoonMenuCategoryDefaultBtwOnSave,
  resolveTenantBtwPercentage,
  sealZReportVatContextForTenant,
  THE_LAGOON_UNIFORM_VAT_PERCENT,
} from '@/lib/lagoon-vat'
import { buildZReportVatContext } from '@/lib/z-report-vat-context'

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

  it('aggregateZReportVatForTenant zonder ctx: alles 21%', () => {
    const agg = aggregateZReportVatForTenant(
      'thelagoon',
      [
        {
          total: 6,
          order_type: 'TAKEAWAY',
          items: [{ name: 'Snack', quantity: 1, price: 6, btw_percentage: 6 }],
        },
      ],
      6,
      null,
    )
    expect(agg.tax_high).toBeGreaterThan(0)
    expect(agg.tax_low).toBe(0)
    expect(agg.tax_mid).toBe(0)
  })

  it('sealZReportVatContextForTenant zet forceUniformVat21', () => {
    const ctx = buildZReportVatContext('demo-frituur', [], [], 'BE', null, 6)
    expect(sealZReportVatContextForTenant('demo-frituur', ctx).forceUniformVat21).not.toBe(true)
    expect(sealZReportVatContextForTenant('thelagoon', ctx).forceUniformVat21).toBe(true)
  })

  it('normalizeLagoonStoredZReportVat vouwt oude 6%-kolom in 21%', () => {
    const row = normalizeLagoonStoredZReportVat('thelagoon', {
      tax_low: 1.5,
      tax_mid: 0,
      tax_high: 0,
    })
    expect(row.tax_low).toBe(0)
    expect(row.tax_high).toBe(1.5)
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
