import { tenantBlockedGateMode } from '@/lib/tenant-blocked-gate-mode'

describe('tenantBlockedGateMode', () => {
  it('personeelsschermen → staff', () => {
    expect(tenantBlockedGateMode('/shop/zaak/admin/kassa')).toBe('staff')
    expect(tenantBlockedGateMode('/admin/kassa')).toBe('staff')
    expect(tenantBlockedGateMode('/shop/zaak/display')).toBe('staff')
    expect(tenantBlockedGateMode('/shop/zaak/klantscherm')).toBe('staff')
    expect(tenantBlockedGateMode('/keuken/zaak')).toBe('staff')
  })

  it('webshop → public', () => {
    expect(tenantBlockedGateMode('/shop/zaak')).toBe('public')
    expect(tenantBlockedGateMode('/shop/zaak/menu')).toBe('public')
    expect(tenantBlockedGateMode('/shop/zaak/checkout')).toBe('public')
    expect(tenantBlockedGateMode('/')).toBe('public')
  })

  it('slug die op een segment lijkt telt niet als deelstring', () => {
    expect(tenantBlockedGateMode('/shop/administratiezaak/menu')).toBe('public')
  })
})
