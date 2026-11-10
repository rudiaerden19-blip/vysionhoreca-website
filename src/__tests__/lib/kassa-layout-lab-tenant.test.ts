import {
  KASSA_LAYOUT_LAB_FALLBACK_TENANT,
  normalizeKassaLayoutLabTenantSlug,
  readKassaLayoutLabTenantSlug,
} from '@/lib/kassa-layout-lab-tenant'

describe('kassa-layout-lab-tenant', () => {
  it('normaliseert slug', () => {
    expect(normalizeKassaLayoutLabTenantSlug('  OhGreen  ')).toBe('ohgreen')
  })

  it('url-tenant wint op fallback', () => {
    expect(readKassaLayoutLabTenantSlug('lomichillplay')).toBe('lomichillplay')
  })

  it('lege url geeft fallback buiten browser', () => {
    expect(readKassaLayoutLabTenantSlug('')).toBe(KASSA_LAYOUT_LAB_FALLBACK_TENANT)
  })
})
