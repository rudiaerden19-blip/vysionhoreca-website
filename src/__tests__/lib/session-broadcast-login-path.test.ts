import { isExplicitTenantLoginPath } from '@/lib/session-broadcast'

describe('isExplicitTenantLoginPath', () => {
  it('matches tenant login routes', () => {
    expect(isExplicitTenantLoginPath('/login')).toBe(true)
    expect(isExplicitTenantLoginPath('/login/forgot-password')).toBe(true)
    expect(isExplicitTenantLoginPath('/login/reset-password')).toBe(true)
  })

  it('does not match shop or superadmin', () => {
    expect(isExplicitTenantLoginPath('/shop/thelagoon/admin')).toBe(false)
    expect(isExplicitTenantLoginPath('/superadmin/login')).toBe(false)
  })
})
