import {
  lagoonForcesUniformVat21,
  resolveTenantBtwPercentage,
  THE_LAGOON_UNIFORM_VAT_PERCENT,
} from '@/lib/lagoon-vat'

describe('lagoon-vat', () => {
  it('alleen thelagoon (incl. the-lagoon)', () => {
    expect(lagoonForcesUniformVat21('thelagoon')).toBe(true)
    expect(lagoonForcesUniformVat21('the-lagoon')).toBe(true)
    expect(lagoonForcesUniformVat21('demo-frituur')).toBe(false)
  })

  it('resolveTenantBtwPercentage blijft 21 voor lagoon ook als DB 6 heeft', () => {
    expect(resolveTenantBtwPercentage('thelagoon', 6, 6)).toBe(THE_LAGOON_UNIFORM_VAT_PERCENT)
    expect(resolveTenantBtwPercentage('demo-frituur', 6, 6)).toBe(6)
    expect(resolveTenantBtwPercentage('demo-frituur', null, 21)).toBe(21)
  })
})
