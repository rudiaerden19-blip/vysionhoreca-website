import {
  isAdminTenant,
  isDemoTenant,
  isInternalPlatformTenant,
} from '@/lib/protected-tenants'

describe('isInternalPlatformTenant', () => {
  it('telt admin/MAIN-zaken niet als klant', () => {
    expect(isAdminTenant('frituurnolim')).toBe(true)
    expect(isAdminTenant('restaurantdekorf')).toBe(true)
    expect(isInternalPlatformTenant('frituurnolim')).toBe(true)
    expect(isInternalPlatformTenant('restaurantdekorf')).toBe(true)
    expect(isInternalPlatformTenant('skippsbv')).toBe(true)
  })

  it('telt demo/test-zaken niet als klant', () => {
    expect(isDemoTenant('gkstest')).toBe(true)
    expect(isDemoTenant('demo-frituur')).toBe(true)
    expect(isInternalPlatformTenant('gkstest')).toBe(true)
  })

  it('telt gewone tenants wel als klant', () => {
    expect(isInternalPlatformTenant('gamma')).toBe(false)
    expect(isInternalPlatformTenant('lomichillplay')).toBe(false)
  })
})
