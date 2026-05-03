import { slugifyBusinessNameForTenant } from '@/lib/register-tenant-slug'

describe('register-tenant-slug', () => {
  it('normalizes business name to lowercase alphanumeric slug', () => {
    expect(slugifyBusinessNameForTenant('Café Du Coin!')).toBe('cafducoin')
    expect(slugifyBusinessNameForTenant('Frituur 123')).toBe('frituur123')
  })

  it('uses shop-prefix fallback when name yields too short slug', () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    try {
      const s = slugifyBusinessNameForTenant('x')
      expect(s.startsWith('shop')).toBe(true)
      expect(s.length).toBeGreaterThan(4)
    } finally {
      spy.mockRestore()
    }
  })
})
